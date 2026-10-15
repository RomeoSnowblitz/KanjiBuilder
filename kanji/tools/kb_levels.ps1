# Builds HanziLevels.txt from Focus Immersion's Hanzi map (https://www.focusimmersion.com/hanzi/):
#   Tier 1-3 - the General Standard Chinese Characters table (8,105 characters, ranks 1-3500 / 3501-6500 / 6501-8105)
#   TBCL     - Taiwan Benchmarks for the Chinese Language level 1-7, keyed by the traditional character
# The site files are cached in -Cache (data.js, data-ext.js, hanzi-tbcl.json) and only downloaded when missing.
# Columns: Hanzi (simplified), Traditional, Rank, Tier, TBCL (blank when the character has no TBCL level).
# Keep this file ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
param(
  [Parameter(Mandatory = $true)][string]$Cache,
  [Parameter(Mandatory = $true)][string]$Out
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
New-Item -ItemType Directory -Force -Path $Cache | Out-Null
$Cache = (Resolve-Path $Cache).Path
$Out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
$files = [ordered]@{
  "data.js"         = "https://www.focusimmersion.com/hanzi/data.js"
  "data-ext.js"     = "https://www.focusimmersion.com/hanzi/data-ext.js"
  "hanzi-tbcl.json" = "https://www.focusimmersion.com/i18n/hanzi-tbcl.json"
}
foreach ($name in $files.Keys) {
  $path = Join-Path $Cache $name
  # The site sometimes resets the connection; retry a few times.
  for ($try = 1; $try -le 5 -and -not ((Test-Path $path) -and (Get-Item $path).Length -gt 1000); $try++) {
    & curl.exe -s -L -A $ua --ssl-no-revoke --compressed --max-time 180 -o $path $files[$name]
    if (-not ((Test-Path $path) -and (Get-Item $path).Length -gt 1000)) { Start-Sleep -Seconds 5 }
  }
  if (-not (Test-Path $path)) { throw "could not download $($files[$name])" }
}

function Read-JsObject([string]$path) {
  $text = [IO.File]::ReadAllText($path, $utf8)
  $text.Substring($text.IndexOf('{'), $text.LastIndexOf('}') - $text.IndexOf('{') + 1) | ConvertFrom-Json
}
$base = Read-JsObject (Join-Path $Cache "data.js")
$ext = Read-JsObject (Join-Path $Cache "data-ext.js")
$tbcl = @{}
foreach ($p in (Read-JsObject (Join-Path $Cache "hanzi-tbcl.json")).level.PSObject.Properties) { $tbcl[$p.Name] = [int]$p.Value }

# A simplified character listed twice keeps its first (lowest) rank and its lowest TBCL level.
$rows = [ordered]@{}
foreach ($e in @($base.t1) + @($ext.t2) + @($ext.t3)) {
  $tier = if ($e.r -le 3500) { 1 } elseif ($e.r -le 6500) { 2 } else { 3 }
  $level = if ($tbcl.ContainsKey($e.t)) { $tbcl[$e.t] } else { 0 }
  if (-not $rows.Contains($e.s)) {
    $rows[$e.s] = [pscustomobject]@{ Trad = $e.t; Rank = [int]$e.r; Tier = $tier; Level = $level }
  } elseif ($level -and (-not $rows[$e.s].Level -or $level -lt $rows[$e.s].Level)) {
    $rows[$e.s].Level = $level
  }
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Hanzi`tTraditional`tRank`tTier`tTBCL")
foreach ($char in $rows.Keys) {
  $r = $rows[$char]
  $lines.Add("$char`t$($r.Trad)`t$($r.Rank)`t$($r.Tier)`t$(if ($r.Level) { $r.Level } else { '' })")
}
[IO.File]::WriteAllLines($Out, $lines, $utf8)
Write-Host ("wrote {0} ({1} characters, {2} with a TBCL level)" -f $Out, $rows.Count, @($rows.Values | Where-Object { $_.Level }).Count)
