param(
    [Parameter(Mandatory)][string]$Cache,
    [Parameter(Mandatory)][string]$Radicals,
    [Parameter(Mandatory)][string]$Out,
    [string]$Extra = ''
)
# Builds Hanzi.txt for the hanzicraft.com frequency list (hanzi_freq.txt, 8,943 characters).
# HanziCraft only serves about 30 character pages an hour, so the page content is rebuilt from the
# open data HanziCraft itself is made from: CC-CEDICT (cedict.txt) for readings and definitions and
# cjk-decomp (cjk-decomp.txt) for the Breakdown tree. Radical, strokes and the fallback readings for
# characters CC-CEDICT lacks come from Unihan; radical-form parts are named from UnicodeData.txt.
# Columns: Frequency, Hanzi, Radical, Strokes, Breakdown, Readings
# Breakdown is only the first split of the tree, each part named.
# -Extra adds characters the frequency list lacks (lines "<char><TAB><rank>", # comments): each is inserted
# so it gets that rank and later characters move down one; a blank rank goes after the last character.
# Keep this file ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
$utf8 = New-Object Text.UTF8Encoding $false
$bullet = [string][char]0x2022

function Get-Hex([string]$c) { '{0:X}' -f [char]::ConvertToUtf32($c, 0) }
function Test-SingleChar([string]$s) {
    $s.Length -eq 1 -or ($s.Length -eq 2 -and [char]::IsHighSurrogate($s[0]))
}

# ---------- pinyin: "mo4" -> "mo" with tone mark ----------
$toneMarks = @{
    'a' = @(0x101, 0xE1, 0x1CE, 0xE0); 'e' = @(0x113, 0xE9, 0x11B, 0xE8); 'i' = @(0x12B, 0xED, 0x1D0, 0xEC)
    'o' = @(0x14D, 0xF3, 0x1D2, 0xF2); 'u' = @(0x16B, 0xFA, 0x1D4, 0xF9); 'v' = @(0x1D6, 0x1D8, 0x1DA, 0x1DC)
}
function Convert-Syllable([string]$syl) {
    $m = [regex]::Match($syl, '^([A-Za-z:]+)([1-5])$')
    if (-not $m.Success) { return $syl.ToLower() }
    $s = $m.Groups[1].Value.ToLower().Replace('u:', 'v')
    $tone = [int]$m.Groups[2].Value
    if ($tone -lt 5) {
        $idx = $s.IndexOf('a')
        if ($idx -lt 0) { $idx = $s.IndexOf('e') }
        if ($idx -lt 0) { $idx = $s.IndexOf('ou') }
        if ($idx -lt 0) { $idx = $s.LastIndexOfAny([char[]]'iouv') }
        if ($idx -ge 0) { $s = $s.Substring(0, $idx) + [char]$toneMarks[[string]$s[$idx]][$tone - 1] + $s.Substring($idx + 1) }
    }
    $s.Replace('v', [string][char]0xFC)
}
function Convert-Pinyin([string]$p) { (($p -split ' ') | ForEach-Object { Convert-Syllable $_ }) -join ' ' }

# Reverse direction for Unihan kMandarin ("qiao" with tone mark -> "qiao2").
$markedVowel = @{}
foreach ($base in $toneMarks.Keys) {
    for ($t = 0; $t -lt 4; $t++) { $markedVowel[[int]$toneMarks[$base][$t]] = @($base, ($t + 1)) }
}
function Convert-ToNumbered([string]$syl) {
    $tone = 5; $sb = New-Object Text.StringBuilder
    foreach ($ch in $syl.ToCharArray()) {
        $code = [int]$ch
        if ($markedVowel.ContainsKey($code)) { [void]$sb.Append($markedVowel[$code][0]); $tone = $markedVowel[$code][1] }
        else { [void]$sb.Append($ch) }
    }
    ($sb.ToString().Replace('v', 'u:').Replace([string][char]0xFC, 'u:')) + $tone
}

# ---------- CC-CEDICT: single-character entries, in file order ----------
$cedict = New-Object 'System.Collections.Generic.Dictionary[string,System.Collections.Generic.List[object]]' ([StringComparer]::Ordinal)
$entryRx = [regex]'^(\S+) (\S+) \[([^\]]*)\] /(.*)/\s*$'
foreach ($line in [IO.File]::ReadLines((Join-Path $Cache 'cedict.txt'), [Text.Encoding]::UTF8)) {
    if ($line.StartsWith('#')) { continue }
    $m = $entryRx.Match($line)
    if (-not $m.Success) { continue }
    $trad = $m.Groups[1].Value; $simp = $m.Groups[2].Value
    if (-not (Test-SingleChar $trad)) { continue }
    $entry = [pscustomobject]@{ Pinyin = $m.Groups[3].Value; Defs = @($m.Groups[4].Value -split '/' | Where-Object { $_ }) }
    foreach ($k in @($trad, $simp) | Select-Object -Unique) {
        if (-not $cedict.ContainsKey($k)) { $cedict[$k] = New-Object System.Collections.Generic.List[object] }
        $cedict[$k].Add($entry)
    }
}

function Format-Readings([string]$c) {
    if (-not $cedict.ContainsKey($c)) {
        # Rare characters CC-CEDICT does not have: fall back to Unihan kMandarin / kDefinition.
        $u = 'U+' + (Get-Hex $c)
        if (-not $uniMandarin.ContainsKey($u)) { return '' }
        $def = if ($uniDefFull.ContainsKey($u)) { " - " + (($uniDefFull[$u] -split ';\s*') -join " $bullet ") } else { '' }
        $i = 0
        return (@($uniMandarin[$u] -split ' ' | Where-Object { $_ } | ForEach-Object {
            $i++
            "$i. $_ ($(Convert-ToNumbered $_))$def"
        })) -join ' | '
    }
    $i = 0
    (@($cedict[$c] | ForEach-Object {
        $i++
        "$i. $(Convert-Pinyin $_.Pinyin) ($($_.Pinyin)) - $($_.Defs -join " $bullet ")"
    })) -join ' | '
}

# Pick a short name from definitions like "(bound form) up; upper; above".
$skipGloss = '^(surname|variant of|old variant|archaic variant|ancient variant|unofficial variant|used in|see |abbr|CL:|Japanese variant|Kangxi radical|radical in Chinese|component in Chinese|also pr|"|\(?classifier)'
function Get-Gloss($defs) {
    foreach ($d in $defs) {
        $s = ([regex]::Replace(([regex]::Replace($d, '\s*\(CL:[^)]*\)', '')), '^\s*(\([^)]*\)\s*)+', '') -split ';')[0].Trim()
        if (-not $s -or $s -match $skipGloss) { continue }
        return $s
    }
    $null
}

# ---------- cjk-decomp ----------
$decomp = New-Object 'System.Collections.Generic.Dictionary[string,object]' ([StringComparer]::Ordinal)
$decompRx = [regex]'^([^:]+):([^(]+)\(([^)]*)\)'
foreach ($line in [IO.File]::ReadLines((Join-Path $Cache 'cjk-decomp.txt'), [Text.Encoding]::UTF8)) {
    $m = $decompRx.Match($line)
    if ($m.Success) { $decomp[$m.Groups[1].Value] = [pscustomobject]@{ Type = $m.Groups[2].Value; Parts = @($m.Groups[3].Value -split ',' | Where-Object { $_ }) } }
}

# First split only. Atomic / mirrored entries (me, c, rrefl, ...) have one part and no split;
# repeat types (ra, rd, r3*, r4*) list the repeated part once.
function Get-FirstSplit([string]$c) {
    if (-not $decomp.ContainsKey($c)) { return @() }
    $d = $decomp[$c]
    $parts = @($d.Parts)
    $rep = [regex]::Match($d.Type, '^r(a|d|\d)')
    if ($rep.Success -and $parts.Count -eq 1) {
        $n = if ($rep.Groups[1].Value -match '^\d$') { [int]$rep.Groups[1].Value } else { 2 }
        $parts = @(1..$n | ForEach-Object { $parts[0] })
    }
    if ($parts.Count -lt 2 -or $parts -contains $c) { return @() }
    $parts
}

# Numbered parts are intermediate shapes with no Unicode glyph: show what they are made of.
function Expand-Shape([string]$p, [int]$depth) {
    if ($p -notmatch '^\d+$') { return (Get-Glyph $p) }
    $sub = @(Get-FirstSplit $p)
    if ($depth -ge 3 -or -not $sub.Count) { return '?' }
    (@($sub | ForEach-Object { Expand-Shape $_ ($depth + 1) })) -join '+'
}

# CJK Strokes block -> the ordinary character HanziCraft shows for them.
$strokeGlyph = @{ 0x31D0 = 0x4E00; 0x31D1 = 0x4E28; 0x31D2 = 0x4E3F; 0x31D3 = 0x4E3F; 0x31D4 = 0x4E36; 0x31E0 = 0x4E59; 0x31DA = 0x4E85 }
function Get-Glyph([string]$p) {
    $cp = [char]::ConvertToUtf32($p, 0)
    if ($strokeGlyph.ContainsKey($cp)) { return [string][char]$strokeGlyph[$cp] }
    $p
}

# ---------- names for parts ----------
$radName = @{}
foreach ($line in [IO.File]::ReadAllLines($Radicals, [Text.Encoding]::UTF8) | Select-Object -Skip 1) {
    $p = $line -split "`t"
    $first = ($p[4] -split ',\s*')[0]
    foreach ($g in @($p[1], $p[2])) { if ($g -and -not $radName.ContainsKey($g)) { $radName[$g] = $first } }
    foreach ($v in ($p[8] -split ';\s*')) { $g = ($v -split ' ')[0]; if ($g -and -not $g.StartsWith('(') -and -not $radName.ContainsKey($g)) { $radName[$g] = $first } }
}
$kdName = @{}
$xml = [IO.File]::ReadAllText((Join-Path $Cache 'kanjidic2.xml'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($xml, '<character>\s*<literal>([^<]+)</literal>[\s\S]*?<meaning>([^<]+)</meaning>')) { $kdName[$m.Groups[1].Value] = [Net.WebUtility]::HtmlDecode($m.Groups[2].Value) }
$uniDef = @{}; $uniDefFull = @{}; $uniMandarin = @{}
foreach ($line in [IO.File]::ReadLines((Join-Path $Cache 'Unihan_Readings.txt'), [Text.Encoding]::UTF8)) {
    $p = $line -split "`t"
    if ($p.Count -lt 3) { continue }
    if ($p[1] -eq 'kMandarin') { $uniMandarin[$p[0]] = $p[2]; continue }
    if ($p[1] -ne 'kDefinition' -or $p[2] -eq 'kwukyel') { continue }
    $uniDefFull[$p[0]] = $p[2]
    $uniDef[[char]::ConvertFromUtf32([Convert]::ToInt32($p[0].Substring(2), 16))] = (($p[2] -split ';')[0] -split ',')[0].Trim()
}
# Radical-form characters (CJK Radicals Supplement, Kangxi Radicals) are named by their Unicode name.
$ucdName = @{}
foreach ($line in [IO.File]::ReadLines((Join-Path $Cache 'UnicodeData.txt'))) {
    $p = $line -split ';'
    $cp = [Convert]::ToInt32($p[0], 16)
    if ($cp -lt 0x2E80 -or $cp -gt 0x2FDF) { continue }
    $ucdName[[char]::ConvertFromUtf32($cp)] = ($p[1] -replace '^(CJK|KANGXI) RADICAL ', '').ToLower()
}

$unnamed = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
function Get-PartName([string]$p) {
    if ($radName.ContainsKey($p)) { return $radName[$p] }
    if ($cedict.ContainsKey($p)) {
        $g = Get-Gloss @($cedict[$p] | ForEach-Object { $_.Defs })
        if ($g) { return $g }
    }
    if ($kdName.ContainsKey($p)) { return $kdName[$p] }
    if ($uniDef.ContainsKey($p)) { return $uniDef[$p] }
    if ($ucdName.ContainsKey($p)) { return $ucdName[$p] }
    $cp = [char]::ConvertToUtf32($p, 0)
    if ($cp -ge 0x31C0 -and $cp -le 0x31EF) { return 'stroke' }
    [void]$unnamed.Add($p)
    $null
}

function Format-Breakdown([string]$c) {
    (@(Get-FirstSplit $c | ForEach-Object {
        if ($_ -match '^\d+$') { "[$(Expand-Shape $_ 0)]" }
        else {
            $g = Get-Glyph $_
            $n = Get-PartName $g
            if ($n) { "$g ($n)" } else { $g }
        }
    })) -join '; '
}

# ---------- Unihan radical / strokes ----------
$rs = @{}; $strokes = @{}
foreach ($line in [IO.File]::ReadLines((Join-Path $Cache 'Unihan_IRGSources.txt'), [Text.Encoding]::UTF8)) {
    if ($line.StartsWith('#')) { continue }
    $p = $line -split "`t"
    if ($p.Count -lt 3) { continue }
    if ($p[1] -eq 'kRSUnicode') { $rs[$p[0]] = (($p[2] -split ' ')[0] -split '\.')[0] -replace "[^0-9]", '' }
    elseif ($p[1] -eq 'kTotalStrokes') { $strokes[$p[0]] = ($p[2] -split ' ')[0] }
}

# ---------- build ----------
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Frequency`tHanzi`tRadical`tStrokes`tBreakdown`tReadings")
$noReading = 0; $noSplit = 0; $dropped = 0; $rank = 0
$chars = New-Object System.Collections.Generic.List[string]
foreach ($line in [IO.File]::ReadAllLines((Join-Path $Cache 'hanzi_freq.txt'), [Text.Encoding]::UTF8)) {
    $c = ($line -split "`t")[0]
    # HanziCraft lists some characters by old GBK private-use code points; they render as empty
    # boxes and have no data anywhere, so they are dropped and the ranks closed up.
    $cp = [char]::ConvertToUtf32($c, 0)
    if ($cp -ge 0xE000 -and $cp -le 0xF8FF) { $dropped++; continue }
    $chars.Add($c)
}
if ($Extra) {
    $extras = @([IO.File]::ReadAllLines($Extra, [Text.Encoding]::UTF8) | Where-Object { $_.Trim() -and -not $_.StartsWith('#') } | ForEach-Object {
        $p = $_ -split "`t"
        [pscustomobject]@{ Char = $p[0]; Rank = $(if ($p.Count -gt 1 -and $p[1].Trim()) { [int]$p[1] } else { 0 }) }
    })
    foreach ($e in $extras) { if ($chars.Contains($e.Char)) { throw "extra $($e.Char) is already in the frequency list" } }
    foreach ($e in $extras | Where-Object { $_.Rank -gt 0 } | Sort-Object Rank) { $chars.Insert([Math]::Min($e.Rank, $chars.Count + 1) - 1, $e.Char) }
    foreach ($e in $extras | Where-Object { $_.Rank -eq 0 }) { $chars.Add($e.Char) }
}
foreach ($c in $chars) {
    $u = 'U+' + (Get-Hex $c)
    $rank++
    $readings = Format-Readings $c
    $breakdown = Format-Breakdown $c
    if (-not $readings) { $noReading++ }
    if (-not $breakdown) { $noSplit++ }
    $lines.Add((@($rank, $c, $rs[$u], $strokes[$u], $breakdown, $readings) -join "`t"))
}
[IO.File]::WriteAllLines($Out, $lines, $utf8)
"hanzi: $($lines.Count - 1), dropped private-use: $dropped, without readings: $noReading, without breakdown: $noSplit, unnamed parts: $($unnamed.Count) $(@($unnamed) -join ' ')"
