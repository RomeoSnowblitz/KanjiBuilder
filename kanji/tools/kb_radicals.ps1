param([Parameter(Mandatory)][string]$Html, [Parameter(Mandatory)][string]$Out, [string]$Equivalents = '')
# Builds Radicals.txt from the kanjialive.com 214 radicals table.
# Columns: ID, Radical, Kangxi glyph, Strokes, Meaning, Reading, Position, Important, Variants
# -Equivalents is Unicode's EquivalentUnifiedIdeograph.txt: variant glyphs from the CJK Radicals
# Supplement block (e.g. U+2E85) are written as the ordinary character (U+4EBB) that the
# breakdown data uses.
# Keep this file ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
$utf8 = New-Object Text.UTF8Encoding $false

$unified = @{}
if ($Equivalents) {
    foreach ($line in [IO.File]::ReadLines($Equivalents)) {
        $m = [regex]::Match($line, '^([0-9A-F]{4,5})(?:\.\.([0-9A-F]{4,5}))?\s*;\s*([0-9A-F]{4,5})')
        if (-not $m.Success) { continue }
        $from = [Convert]::ToInt32($m.Groups[1].Value, 16)
        $to = if ($m.Groups[2].Success) { [Convert]::ToInt32($m.Groups[2].Value, 16) } else { $from }
        if ($from -lt 0x2E80 -or $from -gt 0x2EFF) { continue }
        for ($cp = $from; $cp -le $to; $cp++) { $unified[$cp] = [char]::ConvertFromUtf32([Convert]::ToInt32($m.Groups[3].Value, 16)) }
    }
}
function Unify([string]$g) {
    if (-not $g) { return $g }
    $cp = [char]::ConvertToUtf32($g, 0)
    if ($unified.ContainsKey($cp)) { return $unified[$cp] }
    $g
}
$t = [IO.File]::ReadAllText($Html, [Text.Encoding]::UTF8)
$start = $t.IndexOf('<table id="tablepress-17"')
$body = $t.Substring($start, $t.IndexOf('</table>', $start) - $start)

# Rows whose glyph on kanjialive is not a Kangxi Radical character (or is blank).
$idByMeaning = @{ 'lame leg' = 43; 'young, slight' = 52; 'fang, canine tooth' = 92; 'melon' = 97; 'feather, wing' = 124; 'long' = 168; 'leather' = 178 }
$variantByMeaning = @{ 'Katakana Tsu' = 42 }

function Clean([string]$s) {
    $s = [regex]::Replace($s, '<[^>]+>', '')
    # Private-use glyphs only render in the kanjialive radicals font.
    [regex]::Replace([Net.WebUtility]::HtmlDecode($s), '[\uE000-\uF8FF]', '').Trim()
}
function KangxiGlyph([int]$id) { [char]::ConvertFromUtf32(0x2F00 + $id - 1) }

$main = @{}
$variants = New-Object System.Collections.Generic.List[object]
foreach ($row in [regex]::Matches($body, '<tr class="row-\d+">([\s\S]*?)</tr>')) {
    $cells = @([regex]::Matches($row.Groups[1].Value, '<td class="column-(\d)">([\s\S]*?)</td>') | ForEach-Object { $_.Groups[2].Value })
    if ($cells.Count -lt 7) { continue }
    $glyph = Clean $cells[1]
    $item = [pscustomobject]@{
        Strokes = Clean $cells[0]; Glyph = $glyph
        Position = ([regex]::Match($cells[2], 'alt="(\S+)')).Groups[1].Value
        Meaning = Clean $cells[3]; Reading = Clean $cells[4]
        Important = ((Clean $cells[6]) -eq 'Important')
        ParentGlyph = ''; ParentReading = ''; ParentId = 0
    }
    $variantOf = [regex]::Match((Clean $cells[5]), 'a variant of\s*([^\uFF08(]*)[\uFF08(]([^\uFF09)]+)')
    if ($variantOf.Success) {
        $item.ParentGlyph = $variantOf.Groups[1].Value.Trim()
        $item.ParentReading = $variantOf.Groups[2].Value.Trim()
        $variants.Add($item); continue
    }
    if ($variantByMeaning.ContainsKey($item.Meaning)) { $item.ParentId = $variantByMeaning[$item.Meaning]; $variants.Add($item); continue }
    $cp = if ($glyph) { [char]::ConvertToUtf32($glyph, 0) } else { 0 }
    $id = if ($cp -ge 0x2F00 -and $cp -le 0x2FD5) { $cp - 0x2F00 + 1 } elseif ($idByMeaning.ContainsKey($item.Meaning)) { $idByMeaning[$item.Meaning] } else { 0 }
    if (-not $id) { Write-Warning "Unmapped radical row: '$glyph' ($($item.Meaning))"; continue }
    if ($main.ContainsKey($id)) { Write-Warning "Duplicate radical id $id ($($item.Meaning))"; continue }
    $kx = KangxiGlyph $id
    $item | Add-Member Id $id
    $item | Add-Member Kangxi $kx
    $item | Add-Member Radical ($kx.Normalize([Text.NormalizationForm]::FormKC))
    $item | Add-Member VariantList (New-Object System.Collections.Generic.List[string])
    $shown = Unify $glyph
    if ($shown -and $glyph -ne $kx -and $shown -ne $item.Radical) { $item.VariantList.Add("$shown ($($item.Reading))") }
    $main[$id] = $item
}
$byGlyph = @{}; $byReading = @{}
foreach ($r in $main.Values) { $byGlyph[$r.Kangxi] = $r; $byGlyph[$r.Radical] = $r; if ($r.Glyph) { $byGlyph[$r.Glyph] = $r }; $byReading[$r.Reading] = $r }
foreach ($v in $variants) {
    $p = $null
    if ($v.ParentId) { $p = $main[$v.ParentId] }
    elseif ($v.ParentGlyph -and $byGlyph.ContainsKey($v.ParentGlyph)) { $p = $byGlyph[$v.ParentGlyph] }
    elseif ($byReading.ContainsKey($v.ParentReading)) { $p = $byReading[$v.ParentReading] }
    if (-not $p) { Write-Warning "Variant parent not found: $($v.ParentGlyph) ($($v.ParentReading)) for $($v.Glyph) $($v.Reading)"; continue }
    $vg = Unify $v.Glyph
    $g = if ($vg -and $vg -ne $p.Radical) { "$vg " } else { '' }
    $p.VariantList.Add("$g($($v.Reading))")
}
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("ID`tRadical`tKangxi`tStrokes`tMeaning`tReading`tPosition`tImportant`tVariants")
foreach ($r in ($main.Values | Sort-Object Id)) {
    $lines.Add(("{0}`t{1}`t{2}`t{3}`t{4}`t{5}`t{6}`t{7}`t{8}" -f $r.Id, $r.Radical, $r.Kangxi, $r.Strokes, $r.Meaning, $r.Reading, $r.Position, $(if ($r.Important) { 'yes' } else { '' }), ($r.VariantList -join '; ')))
}
[IO.File]::WriteAllLines($Out, $lines, $utf8)
"radicals: $($main.Count), variants: $($variants.Count)"
