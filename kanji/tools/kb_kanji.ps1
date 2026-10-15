param(
    [Parameter(Mandatory)][string]$Cache,
    [Parameter(Mandatory)][string]$Radicals,
    [Parameter(Mandatory)][string]$Out
)
# Builds Kanji.txt from KANJIDIC2 (list, grade, radical, strokes, meanings) and thekanjimap.com pages
# (frequency, readings, first-level composition with names, example words).
# Columns: Kanji, Grade, Frequency, Radical, Strokes, Meaning, Kunyomi, Onyomi, Composition, Kun Examples, On Examples
# Keep this file ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
$utf8 = New-Object Text.UTF8Encoding $false
$ideoComma = [string][char]0x3001

function Get-BalancedObject([string]$text, [int]$start) {
    # $start points at '{'; returns the full JSON object text, honouring strings.
    $depth = 0; $inStr = $false; $esc = $false
    for ($i = $start; $i -lt $text.Length; $i++) {
        $c = $text[$i]
        if ($inStr) {
            if ($esc) { $esc = $false } elseif ($c -eq '\') { $esc = $true } elseif ($c -eq '"') { $inStr = $false }
            continue
        }
        if ($c -eq '"') { $inStr = $true }
        elseif ($c -eq '{') { $depth++ }
        elseif ($c -eq '}') { $depth--; if ($depth -eq 0) { return $text.Substring($start, $i - $start + 1) } }
    }
    $null
}
function Get-JsonField([string]$payload, [string]$name) {
    $i = $payload.IndexOf("`"$name`":{")
    if ($i -lt 0) { return $null }
    $obj = Get-BalancedObject $payload ($i + $name.Length + 3)
    if ($obj) { $obj | ConvertFrom-Json } else { $null }
}
function Get-NextPayload([string]$html) {
    $sb = New-Object Text.StringBuilder
    foreach ($m in [regex]::Matches($html, 'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)')) {
        [void]$sb.Append(($m.Groups[1].Value | ConvertFrom-Json))
    }
    $sb.ToString()
}
function Join-Examples($list) {
    $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
    @($list | Where-Object { $_ -and $_.meaning -and $_.reading } | ForEach-Object { "$($_.example) ($($_.reading)) - $($_.meaning)" } | Where-Object { $seen.Add($_) }) -join ' | '
}
# "two, two radical (no. 7)" -> "two"; "heart, mind, spirit, heart radical (no. 61)" -> "heart, mind, spirit"
function Get-PartName([string]$s) {
    if (-not $s) { return '' }
    $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    @($s -split ',\s*' | ForEach-Object { ($_ -replace '\s*radical\b.*$', '').Trim() } | Where-Object { $_ -and $seen.Add($_) }) -join ', '
}
function Clean-Field([string]$s) { if ($null -eq $s) { '' } else { ($s -replace '[\t\r\n]+', ' ').Trim() } }

# Radical meanings, for naming composition parts the graph leaves unnamed.
$radMeaning = @{}
foreach ($line in [IO.File]::ReadAllLines($Radicals, [Text.Encoding]::UTF8) | Select-Object -Skip 1) {
    $p = $line -split "`t"
    $radMeaning[$p[1]] = $p[4]; $radMeaning[$p[2]] = $p[4]
}

# KANJIDIC2
$dic = @{}
$xml = [IO.File]::ReadAllText((Join-Path $Cache 'kanjidic2.xml'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($xml, '<character>\s*<literal>([^<]+)</literal>([\s\S]*?)</character>')) {
    $b = $m.Groups[2].Value
    $meanings = @([regex]::Matches($b, '<meaning>([^<]+)</meaning>') | ForEach-Object { [Net.WebUtility]::HtmlDecode($_.Groups[1].Value) })
    $dic[$m.Groups[1].Value] = [pscustomobject]@{
        Grade = ([regex]::Match($b, '<grade>(\d+)</grade>')).Groups[1].Value
        Freq = ([regex]::Match($b, '<freq>(\d+)</freq>')).Groups[1].Value
        Radical = ([regex]::Match($b, '<rad_value rad_type="classical">(\d+)</rad_value>')).Groups[1].Value
        Strokes = ([regex]::Match($b, '<stroke_count>(\d+)</stroke_count>')).Groups[1].Value
        Meaning = $meanings -join ', '
        FirstMeaning = $(if ($meanings.Count) { $meanings[0] } else { '' })
        Kun = @([regex]::Matches($b, '<reading r_type="ja_kun">([^<]+)</reading>') | ForEach-Object { $_.Groups[1].Value }) -join $ideoComma
        On = @([regex]::Matches($b, '<reading r_type="ja_on">([^<]+)</reading>') | ForEach-Object { $_.Groups[1].Value }) -join $ideoComma
    }
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Kanji`tGrade`tFrequency`tRadical`tStrokes`tMeaning`tKunyomi`tOnyomi`tComposition`tKun Examples`tOn Examples")
$noPage = 0; $noComp = 0
foreach ($row in [IO.File]::ReadAllLines((Join-Path $Cache 'kanji_grades.txt'), [Text.Encoding]::UTF8)) {
    $k = ($row -split "`t")[0]
    $d = $dic[$k]
    $hex = '{0:X}' -f [char]::ConvertToUtf32($k, 0)
    $page = Join-Path $Cache "kmap\$hex.html"
    $info = $null; $graph = $null
    if (Test-Path $page) {
        $payload = Get-NextPayload ([IO.File]::ReadAllText($page, [Text.Encoding]::UTF8))
        $ki = Get-JsonField $payload 'kanjiInfo'
        if ($ki) { $info = $ki.jishoData }
        $graph = Get-JsonField $payload 'graphData'
    }
    if (-not $info) { $noPage++ }

    $freq = if ($info -and $info.newspaperFrequencyRank) { $info.newspaperFrequencyRank } else { $d.Freq }
    $kun = if ($info -and @($info.kunyomi).Count) { @($info.kunyomi) -join $ideoComma } else { $d.Kun }
    $on = if ($info -and @($info.onyomi).Count) { @($info.onyomi) -join $ideoComma } else { $d.On }

    $parts = New-Object System.Collections.Generic.List[string]
    if ($graph -and $graph.withOutLinks) {
        $nodeMeaning = @{}
        foreach ($n in @($graph.withOutLinks.nodes)) { if ($n.id) { $nodeMeaning[$n.id] = $n.data.meaning } }
        foreach ($l in @($graph.withOutLinks.links)) {
            if ($l.target -ne $k -or $l.source -eq $k) { continue }
            $name = Get-PartName $nodeMeaning[$l.source]
            if (-not $name -and $radMeaning.ContainsKey($l.source)) { $name = $radMeaning[$l.source] }
            if (-not $name -and $dic.ContainsKey($l.source)) { $name = $dic[$l.source].Meaning }
            $parts.Add($(if ($name) { "$($l.source) ($name)" } else { $l.source }))
        }
    }
    if (-not $parts.Count) { $noComp++ }

    $lines.Add((@(
        $k, $d.Grade, $freq, $d.Radical, $d.Strokes, (Clean-Field $d.Meaning), (Clean-Field $kun), (Clean-Field $on),
        (Clean-Field ($parts -join '; ')),
        (Clean-Field $(if ($info) { Join-Examples $info.kunyomiExamples } else { '' })),
        (Clean-Field $(if ($info) { Join-Examples $info.onyomiExamples } else { '' }))
    ) -join "`t"))
}
[IO.File]::WriteAllLines($Out, $lines, $utf8)
"kanji: $($lines.Count - 1), without a kanjimap page: $noPage, without composition: $noComp"
