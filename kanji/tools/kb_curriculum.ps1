# Builds Curriculum.txt from the 2022 Chinese compulsory education curriculum standard:
#   Basic  - Appendix 4, 300 basic characters in the book's stroke order (hand transcribed: -Basic)
#   Table1 - Appendix 5 table 1, 2500 common characters, numbered 1-2500 in pinyin order (OCR: -Ocr)
#   Table2 - Appendix 5 table 2, 1000 more characters, numbered 1-1000 in pinyin order (OCR: -Ocr)
# -Fixes overrides OCR entries ("Table1<TAB>number<TAB>char"); checked by eye against the page images.
# Every entry is validated against Hanzi.txt (exists, stroke counts for Basic, pinyin order for the tables).
# -LearnOut writes the Learn order, each group by Hanzi.txt frequency unless noted:
#   1. the book: Basic in book order, then the rest of Table1, then Table2
#   2. -Levels (HanziLevels.txt from kb_levels.ps1): TBCL level 1-7, then Tier 2, then Tier 3; characters
#      the site lists but Hanzi.txt lacks are left out (all rare, and the app has no data for them)
#   3. book characters with no Hanzi.txt entry
# -MissingOut lists the characters without a usable place: book characters with no Hanzi.txt entry, and
# Hanzi.txt characters that are in no list (deleted once both are empty).
# Usage: .\kb_curriculum.ps1 -Ocr ..\CurriculumStandard2022.txt -Basic curriculum_basic300.txt -Fixes curriculum_fixes.txt -Hanzi ..\Hanzi.txt
#          -Levels ..\HanziLevels.txt -Out ..\Curriculum.txt -LearnOut ..\LearnOrder.txt -MissingOut ..\Missing.txt
param(
  [Parameter(Mandatory = $true)][string[]]$Ocr,
  [Parameter(Mandatory = $true)][string]$Basic,
  [Parameter(Mandatory = $true)][string]$Fixes,
  [Parameter(Mandatory = $true)][string]$Hanzi,
  [string]$Levels = "",
  [string]$Out = "",
  [string]$LearnOut = "",
  [string]$MissingOut = ""
)

$ErrorActionPreference = "Stop"
$Ocr = @($Ocr | ForEach-Object { (Resolve-Path $_).Path })
$Basic, $Fixes, $Hanzi = @($Basic, $Fixes, $Hanzi) | ForEach-Object { (Resolve-Path $_).Path }
if ($Levels) { $Levels = (Resolve-Path $Levels).Path }
$Out, $LearnOut, $MissingOut = @($Out, $LearnOut, $MissingOut) | ForEach-Object {
  if ($_) { $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($_) } else { "" }
}
$utf8 = New-Object System.Text.UTF8Encoding $false
$table1Marker = "$([char]0x5B57)$([char]0x8868)$([char]0x4E00)"
$table2Marker = "$([char]0x5B57)$([char]0x8868)$([char]0x4E8C)"
$sizes = @{ Table1 = 2500; Table2 = 1000 }

# --- Hanzi.txt: strokes and numbered pinyin per character ---
$hanziInfo = @{}
foreach ($line in [System.IO.File]::ReadAllLines($Hanzi, $utf8) | Select-Object -Skip 1) {
  $cols = $line.Split("`t")
  if ($cols.Count -lt 6) { continue }
  $keys = New-Object System.Collections.Generic.List[string]
  foreach ($m in [regex]::Matches($cols[5], "\(([A-Za-z:]+[1-5])(?: [A-Za-z:]+[1-5])*\)")) {
    # Sort keys match the tables' order: by syllable only (tones are not strictly ordered within a syllable),
    # with u-umlaut sorted as plain u (lu, lu:, luan, lu:e, lun).
    $key = $m.Groups[1].Value.ToLowerInvariant().Replace("u:", "u") -replace "[1-5]$", ""
    if (-not $keys.Contains($key)) { $keys.Add($key) }
  }
  $hanziInfo[$cols[1]] = @{ Freq = [int]$cols[0]; Strokes = [int]$cols[3]; Pinyin = $keys }
}

$problems = New-Object System.Collections.Generic.List[string]

# --- Basic 300 ---
$basicList = New-Object System.Collections.Generic.List[object]
foreach ($line in [System.IO.File]::ReadAllLines($Basic, $utf8)) {
  if (-not $line.Trim() -or $line.StartsWith("#")) { continue }
  $cols = $line.Split("`t")
  $basicList.Add([pscustomobject]@{ Strokes = [int]$cols[0]; Char = $cols[1]; Variant = $(if ($cols.Count -gt 2) { $cols[2] } else { "" }) })
}
if ($basicList.Count -ne 300) { $problems.Add("Basic: expected 300 characters, found $($basicList.Count)") }
$seenBasic = @{}
foreach ($entry in $basicList) {
  if ($seenBasic.ContainsKey($entry.Char)) { $problems.Add("Basic: duplicate $($entry.Char)") }
  $seenBasic[$entry.Char] = $true
  $info = $hanziInfo[$entry.Char]
  if (-not $info) { $problems.Add("Basic: $($entry.Char) is not in Hanzi.txt") }
  elseif ($info.Strokes -ne $entry.Strokes) { Write-Host "note: Basic $($entry.Char) is $($entry.Strokes) strokes in the book, $($info.Strokes) in Hanzi.txt" }
}

# --- Tables 1 and 2: every OCR file votes for each number's character ---
$votes = @{ Table1 = @{}; Table2 = @{} }
$entryPattern = New-Object System.Text.RegularExpressions.Regex "^(\d{1,4})\s*([\u2E80-\u2FDF\u3400-\u9FFF\uF900-\uFAFF])$"
foreach ($file in $Ocr) {
  $ocrLines = [System.IO.File]::ReadAllLines($file, $utf8)
  # OCR can read a page's entries before its heading, so each table starts at the page holding its heading.
  $pageStart = 0
  $tableStarts = @{}
  for ($i = 0; $i -lt $ocrLines.Count; $i++) {
    $line = $ocrLines[$i].Trim()
    if ($line.StartsWith("=== Page ")) { $pageStart = $i }
    elseif ($line.StartsWith($table1Marker)) { $tableStarts[$pageStart] = "Table1" }
    elseif ($line.StartsWith($table2Marker)) { $tableStarts[$pageStart] = "Table2" }
  }
  $current = $null
  for ($i = 0; $i -lt $ocrLines.Count; $i++) {
    if ($tableStarts.ContainsKey($i)) { $current = $tableStarts[$i] }
    if (-not $current) { continue }
    $m = $entryPattern.Match($ocrLines[$i].Trim())
    if (-not $m.Success) { continue }
    $number = [int]$m.Groups[1].Value
    if ($number -lt 1 -or $number -gt $sizes[$current]) { continue }
    if (-not $votes[$current].ContainsKey($number)) { $votes[$current][$number] = @{} }
    $votes[$current][$number][$m.Groups[2].Value] += 1
  }
}

$fixed = @{ Table1 = @{}; Table2 = @{} }
foreach ($line in [System.IO.File]::ReadAllLines($Fixes, $utf8)) {
  if (-not $line.Trim() -or $line.StartsWith("#")) { continue }
  $cols = $line.Split("`t")
  $fixed[$cols[0]][[int]$cols[1]] = $cols[2]
}

function Test-Order($prev, $item, $next) {
  # True when some reading of $item fits between some reading of its neighbours.
  foreach ($r in $item) {
    $okPrev = (-not $prev) -or @($prev | Where-Object { [string]::CompareOrdinal($_, $r) -le 0 }).Count -gt 0
    $okNext = (-not $next) -or @($next | Where-Object { [string]::CompareOrdinal($r, $_) -le 0 }).Count -gt 0
    if ($okPrev -and $okNext) { return $true }
  }
  return $false
}

function Get-Pinyin($char) { if ($char -and $hanziInfo[$char]) { $hanziInfo[$char].Pinyin } else { $null } }

# Take the most-voted reading, unless a less-voted one is the only reading that is a known character in pinyin order.
$tables = @{ Table1 = @{}; Table2 = @{} }
$disputed = @{ Table1 = @{}; Table2 = @{} }
foreach ($name in @("Table1", "Table2")) {
  for ($n = 1; $n -le $sizes[$name]; $n++) {
    if ($fixed[$name].ContainsKey($n)) { $tables[$name][$n] = $fixed[$name][$n]; continue }
    if (-not $votes[$name].ContainsKey($n)) { continue }
    $ranked = @($votes[$name][$n].GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object { $_.Key })
    $tables[$name][$n] = $ranked[0]
    if ($ranked.Count -gt 1) { $disputed[$name][$n] = ($votes[$name][$n].GetEnumerator() | ForEach-Object { "$($_.Key)x$($_.Value)" }) -join " " }
  }
  for ($n = 1; $n -le $sizes[$name]; $n++) {
    if (-not $disputed[$name].ContainsKey($n)) { continue }
    $prev = Get-Pinyin $tables[$name][$n - 1]
    $next = Get-Pinyin $tables[$name][$n + 1]
    $ranked = @($votes[$name][$n].GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object { $_.Key })
    $fits = @($ranked | Where-Object { $hanziInfo[$_] -and (Test-Order $prev $hanziInfo[$_].Pinyin $next) })
    if ($fits.Count) { $tables[$name][$n] = $fits[0] }
  }
}

$allChars = @{}
foreach ($name in @("Table1", "Table2")) {
  $table = $tables[$name]
  $missing = @(1..$sizes[$name] | Where-Object { -not $table.ContainsKey($_) })
  if ($missing.Count) { $problems.Add("${name}: missing numbers " + ($missing -join ",")) }
  for ($n = 1; $n -le $sizes[$name]; $n++) {
    if (-not $table.ContainsKey($n)) { continue }
    $char = $table[$n]
    if ($allChars.ContainsKey($char)) { $problems.Add("${name} #${n}: $char already listed as $($allChars[$char])") }
    else { $allChars[$char] = "$name #$n" }
    $info = $hanziInfo[$char]
    if ($fixed[$name].ContainsKey($n)) { continue }
    if (-not $info) { $problems.Add("${name} #${n}: $char is not in Hanzi.txt"); continue }
    $prev = if ($table.ContainsKey($n - 1) -and $hanziInfo[$table[$n - 1]]) { $hanziInfo[$table[$n - 1]].Pinyin } else { $null }
    $next = if ($table.ContainsKey($n + 1) -and $hanziInfo[$table[$n + 1]]) { $hanziInfo[$table[$n + 1]].Pinyin } else { $null }
    if (-not (Test-Order $prev $info.Pinyin $next)) {
      $problems.Add("${name} #${n}: $char ($($info.Pinyin -join '/')) is out of pinyin order")
    }
  }
}
foreach ($entry in $basicList) {
  if (-not $allChars.ContainsKey($entry.Char)) { $problems.Add("Basic: $($entry.Char) is not in Table1 or Table2") }
}

Write-Host ("Basic {0}, Table1 {1}, Table2 {2}, problems {3}" -f $basicList.Count, $tables.Table1.Count, $tables.Table2.Count, $problems.Count)
$problems | ForEach-Object { Write-Host $_ }
foreach ($name in @("Table1", "Table2")) {
  foreach ($n in $disputed[$name].Keys | Sort-Object) {
    if (-not $fixed[$name].ContainsKey($n)) { Write-Host "disputed: $name #$n picked $($tables[$name][$n]) from $($disputed[$name][$n])" }
  }
}

if ($Out) {
  if ($problems.Count) { throw "Not writing $Out until every problem is resolved." }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("List`tNumber`tHanzi`tStrokes`tVariant")
  $n = 0
  foreach ($entry in $basicList) { $n++; $lines.Add("Basic`t$n`t$($entry.Char)`t$($entry.Strokes)`t$($entry.Variant)") }
  foreach ($name in @("Table1", "Table2")) {
    for ($i = 1; $i -le $sizes[$name]; $i++) {
      $char = $tables[$name][$i]
      $lines.Add("$name`t$i`t$char`t`t")
    }
  }
  [System.IO.File]::WriteAllLines($Out, $lines, $utf8)
  Write-Host "wrote $Out ($($lines.Count - 1) rows)"
}

if ($LearnOut -or $MissingOut) {
  if ($problems.Count) { throw "Not writing the Learn order until every problem is resolved." }
  $order = New-Object System.Collections.Generic.List[string]
  $missing = New-Object System.Collections.Generic.List[object]
  $placed = @{}
  $n = 0
  foreach ($entry in $basicList) { $n++; $order.Add("$($order.Count + 1)`t$($entry.Char)`tBasic $n"); $placed[$entry.Char] = $true }
  foreach ($name in @("Table1", "Table2")) {
    $rest = @(1..$sizes[$name] | ForEach-Object { [pscustomobject]@{ Char = $tables[$name][$_]; Number = $_ } } | Where-Object { -not $placed[$_.Char] })
    $known = $rest | Where-Object { $hanziInfo[$_.Char] } | Sort-Object -Property @{ Expression = { $hanziInfo[$_.Char].Freq } }, Number
    foreach ($entry in $known) { $order.Add("$($order.Count + 1)`t$($entry.Char)`t$name $($entry.Number)"); $placed[$entry.Char] = $true }
    foreach ($entry in $rest | Where-Object { -not $hanziInfo[$_.Char] }) {
      $missing.Add([pscustomobject]@{ Char = $entry.Char; List = $name; Number = $entry.Number })
    }
  }
  $counts = [ordered]@{ Book = $order.Count }
  if ($Levels) {
    $site = @([System.IO.File]::ReadAllLines($Levels, $utf8) | Select-Object -Skip 1 | ForEach-Object {
      $c = $_.Split("`t")
      [pscustomobject]@{ Char = $c[0]; Tier = [int]$c[3]; Level = $(if ($c[4]) { [int]$c[4] } else { 0 }) }
    } | Where-Object { -not $placed[$_.Char] })
    $byFreq = @{ Expression = { $hanziInfo[$_.Char].Freq } }
    $groups = @(
      @{ Name = "TBCL"; Items = @($site | Where-Object { $_.Level -and $hanziInfo[$_.Char] } | Sort-Object -Property Level, $byFreq); Source = { param($e) "TBCL L$($e.Level)" } },
      @{ Name = "Tiers"; Items = @($site | Where-Object { -not $_.Level -and $hanziInfo[$_.Char] } | Sort-Object -Property Tier, $byFreq); Source = { param($e) "Tier $($e.Tier)" } }
    )
    foreach ($group in $groups) {
      foreach ($entry in $group.Items) {
        $source = & $group.Source $entry
        $order.Add("$($order.Count + 1)`t$($entry.Char)`t$source"); $placed[$entry.Char] = $true
      }
      $counts[$group.Name] = $group.Items.Count
    }
  }
  foreach ($entry in $missing) { $order.Add("$($order.Count + 1)`t$($entry.Char)`t$($entry.List) $($entry.Number)") }
  if ($LearnOut) {
    $order.Insert(0, "Order`tHanzi`tSource")
    [System.IO.File]::WriteAllLines($LearnOut, $order, $utf8)
    Write-Host ("wrote {0} ({1} rows: {2})" -f $LearnOut, ($order.Count - 1), (($counts.Keys | ForEach-Object { "$_ $($counts[$_])" }) -join ", "))
  }
  $unplaced = @($hanziInfo.Keys | Where-Object { -not $placed[$_] } | Sort-Object -Property @{ Expression = { $hanziInfo[$_].Freq } })
  if ($MissingOut -and -not $missing.Count -and -not $unplaced.Count) {
    if (Test-Path -LiteralPath $MissingOut) { Remove-Item -LiteralPath $MissingOut; Write-Host "removed $MissingOut (nothing left to place)" }
  } elseif ($MissingOut) {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Characters without a usable place in LearnOrder.txt, for someone to place by hand:")
    $lines.Add("#   No data     - in the book but not in Hanzi.txt, so the app has nothing to show; List says where.")
    $lines.Add("#   Not in list - in Hanzi.txt but in no list; the app's Lesson sort puts them after LearnOrder.txt, by frequency.")
    $lines.Add("Hanzi`tFrequency`tProblem`tList")
    foreach ($entry in $missing) {
      $neighbours = "$($tables[$entry.List][$entry.Number - 1]) _ $($tables[$entry.List][$entry.Number + 1])"
      $lines.Add("$($entry.Char)`t`tNo data`t$($entry.List) $($entry.Number) ($neighbours)")
    }
    foreach ($char in $unplaced) { $lines.Add("$char`t$($hanziInfo[$char].Freq)`tNot in list`t") }
    [System.IO.File]::WriteAllLines($MissingOut, $lines, $utf8)
    Write-Host "wrote $MissingOut ($($missing.Count) without data, $($unplaced.Count) in no list)"
  }
}
