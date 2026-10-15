param(
    [Parameter(Mandatory)][string]$ListFile,
    [int]$Parallel = 3,
    [int]$Chunk = 200,
    [int]$PauseSeconds = 2
)
# ListFile lines: <url><TAB><output path>. Pages already cached (and not a block page) are skipped.
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
$utf8 = New-Object Text.UTF8Encoding $false

function Test-Good([string]$path) {
    if (-not (Test-Path $path)) { return $false }
    $f = Get-Item $path
    if ($f.Length -lt 2000) { return $false }
    $head = [IO.File]::ReadAllText($path)
    -not ($head.Contains('cf-browser-verification') -or $head.Contains('Just a moment...') -or $head.Contains('Attention Required!'))
}

$jobs = foreach ($line in [IO.File]::ReadAllLines($ListFile, $utf8)) {
    if (-not $line.Trim()) { continue }
    $p = $line -split "`t"
    [pscustomobject]@{ Url = $p[0]; Out = $p[1] }
}
$todo = @($jobs | Where-Object { -not (Test-Good $_.Out) })
Write-Host "total $($jobs.Count), cached $($jobs.Count - $todo.Count), to fetch $($todo.Count)"

for ($round = 1; $round -le 3 -and $todo.Count; $round++) {
    for ($i = 0; $i -lt $todo.Count; $i += $Chunk) {
        $part = $todo[$i..([Math]::Min($i + $Chunk, $todo.Count) - 1)]
        $cfg = [IO.Path]::GetTempFileName()
        $sb = New-Object Text.StringBuilder
        foreach ($j in $part) {
            New-Item -ItemType Directory -Force (Split-Path $j.Out) | Out-Null
            [void]$sb.AppendLine("url = `"$($j.Url)`"")
            [void]$sb.AppendLine("output = `"$($j.Out.Replace('\', '/'))`"")
        }
        [IO.File]::WriteAllText($cfg, $sb.ToString(), $utf8)
        & curl.exe -s -L -A $ua --compressed --retry 3 --retry-delay 5 --max-time 60 -Z --parallel-max $Parallel -K $cfg
        Remove-Item $cfg -ErrorAction SilentlyContinue
        Write-Host ("round {0}: {1}/{2}" -f $round, [Math]::Min($i + $Chunk, $todo.Count), $todo.Count)
        Start-Sleep -Seconds $PauseSeconds
    }
    $todo = @($todo | Where-Object { -not (Test-Good $_.Out) })
    Write-Host "after round ${round}: $($todo.Count) still missing"
    if ($todo.Count) { Start-Sleep -Seconds 30 }
}
if ($todo.Count) { $todo | ForEach-Object { "MISSING`t$($_.Url)" } }
