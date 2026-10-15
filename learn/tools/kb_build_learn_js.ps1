# Packs the Learn curricula into scripts the Learn pages load:
#   learn\Alphabet\<Ui>\XX-YY.txt   -> learn\data\alphabet-xx-yy.js  window.LEARN_ALPHABET["xx-yy"]
#   learn\Vocabulary\<Ui>\XX-YY.txt -> learn\data\vocab-xx-yy.js     window.LEARN_VOCAB["xx-yy"]
#   learn\Sentences\<Ui>\XX-YY.txt  -> learn\data\sentence-xx-yy.js  window.LEARN_SENTENCES["xx-yy"]
# (XX = UI language, YY = language being learned). Each holds [[lesson name, [rows]], ...], one entry per
# curriculum lesson in file order; a row is "text<TAB>reading<TAB>meanings" (reading is empty when the file
# has none). A lesson whose only line is "null" is not ready yet and is kept with no rows, so the lesson
# numbers stay the same. A file with no rows at all (empty, or "null" everywhere) gets no script.
# Afterwards learn\data\ready.js lists every pair that has a script, which is how the Learn chart knows
# which boxes are ready. The pages are opened from file://, so the data has to ship as scripts.
# Source format: "N Lesson name" starts a lesson; " text - meanings" or " text - [reading] - meanings" is a row.
# In " text - meanings - [reading]" the reading belongs to the meaning and is dropped. The "Still Needs Review"
# and "Approved in Sentences" sections (words not approved yet, from the AA lists) are skipped up to the next
# lesson.
# -Ui limits the run to some UI folders (for example -Ui English,German); -Kind to Alphabet, Vocabulary or Sentences.
# A file that cannot be read is reported and skipped, so one bad file does not stop the others.
# ASCII-only on purpose: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string[]]$Ui = @(),
    [ValidateSet('Alphabet', 'Vocabulary', 'Sentences')]
    [string[]]$Kind = @('Alphabet', 'Vocabulary', 'Sentences')
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$codes = @{ ZH = 'zh'; EN = 'en'; FR = 'fr'; DE = 'de'; IT = 'it'; JP = 'ja'; KO = 'ko'; PO = 'pt'; RU = 'ru'; ES = 'es' }
$kinds = @{
    Alphabet   = @{ prefix = 'alphabet'; global = 'LEARN_ALPHABET' }
    Vocabulary = @{ prefix = 'vocab'; global = 'LEARN_VOCAB' }
    Sentences  = @{ prefix = 'sentence'; global = 'LEARN_SENTENCES' }
}
$outDir = Join-Path $Root 'learn\data'
if (-not (Test-Path -LiteralPath $outDir)) { [void](New-Item -ItemType Directory -Path $outDir) }

function ConvertTo-JsString([string]$s) {
    $sb = New-Object System.Text.StringBuilder ($s.Length + 8)
    [void]$sb.Append('"')
    foreach ($ch in $s.ToCharArray()) {
        $code = [int]$ch
        switch ($code) {
            0x22 { [void]$sb.Append('\"'); continue }
            0x5C { [void]$sb.Append('\\'); continue }
            0x09 { [void]$sb.Append('\t'); continue }
            0x0A { [void]$sb.Append('\n'); continue }
            0x0D { [void]$sb.Append('\r'); continue }
            0x2028 { [void]$sb.Append('\u2028'); continue }
            0x2029 { [void]$sb.Append('\u2029'); continue }
            default {
                if ($code -lt 0x20) { [void]$sb.Append(('\u{0:x4}' -f $code)) }
                else { [void]$sb.Append($ch) }
            }
        }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

# Some files start with text copied from the web page before lesson 1; it is ignored. When lesson 1 has lost
# its number, the last such line before the first row is taken as its name.
function Read-Curriculum([string]$path, [string]$name) {
    $lines = [IO.File]::ReadAllLines($path, $utf8)
    $lessons = New-Object System.Collections.Generic.List[object]
    $current = $null
    $rowCount = 0
    $loose = ''
    $skipping = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line.Trim() -eq '') { continue }
        if ($line -match '^(\d+)\s+(.+)$') {
            if ([int]$Matches[1] -ne $lessons.Count + 1) {
                Write-Warning ("{0} line {1}: lesson {2} follows lesson {3}" -f $name, ($i + 1), $Matches[1], $lessons.Count)
            }
            $current = @{ name = $Matches[2].Trim(); rows = New-Object System.Collections.Generic.List[string] }
            $lessons.Add($current)
            $skipping = $false
            continue
        }
        if ($line.Trim() -eq 'Still Needs Review' -or $line.Trim() -eq 'Approved in Sentences') {
            $skipping = $true
            continue
        }
        if ($skipping) { continue }
        if ($current -and $line.Trim() -eq 'null') { continue }
        if ($line -match '^\s+(.+?) -( \[[^\]]*\] -)?\s*$') {
            Write-Warning ("{0} line {1}: '{2}' has no meaning, skipped" -f $name, ($i + 1), $Matches[1])
            continue
        }
        if ($line -match '^\s+(.+?) - \[([^\]]*)\] - (.+)$') {
            $text = $Matches[1]; $reading = $Matches[2]; $meanings = $Matches[3]
        } elseif ($line -match '^\s+(.+?) - (.+?) - \[[^\]]*\]\s*$') {
            $text = $Matches[1]; $reading = ''; $meanings = $Matches[2]
        } elseif ($line -match '^\s+(.+?) - (.+)$') {
            $text = $Matches[1]; $reading = ''; $meanings = $Matches[2]
        } elseif (-not $current) {
            $loose = $line.Trim()
            continue
        } else {
            throw ("{0} line {1}: cannot read '{2}'" -f $name, ($i + 1), $line)
        }
        if (-not $current) {
            if (-not $loose) { throw ("{0} line {1}: row before the first lesson" -f $name, ($i + 1)) }
            Write-Warning ("{0}: lesson 1 has no number; using '{1}' as its name" -f $name, $loose)
            $current = @{ name = $loose; rows = New-Object System.Collections.Generic.List[string] }
            $lessons.Add($current)
        }
        $current.rows.Add($text.Trim() + "`t" + $reading.Trim() + "`t" + $meanings.Trim())
        $rowCount++
    }
    return @{ lessons = $lessons; rows = $rowCount }
}

$failed = 0
foreach ($kindName in $Kind) {
    $spec = $kinds[$kindName]
    $folders = $Ui
    if (-not $folders.Count) {
        $folders = Get-ChildItem -LiteralPath (Join-Path $Root "learn\$kindName") -Directory | Sort-Object Name | ForEach-Object { $_.Name }
    }
    foreach ($folder in $folders) {
        $srcDir = Join-Path $Root "learn\$kindName\$folder"
        if (-not (Test-Path -LiteralPath $srcDir)) { continue }
        foreach ($file in Get-ChildItem -LiteralPath $srcDir -Filter '*.txt' | Sort-Object Name) {
            if ($file.BaseName -notmatch '^([A-Z]{2})-([A-Z]{2})$' -or -not $codes[$Matches[1]] -or -not $codes[$Matches[2]]) {
                Write-Warning "skipping $kindName/$folder/$($file.Name) (name is not XX-YY)"
                continue
            }
            $pair = $codes[$Matches[1]] + '-' + $codes[$Matches[2]]
            $label = "$kindName/$($file.Name)"
            $out = Join-Path $outDir "$($spec.prefix)-$pair.js"
            try {
                $data = Read-Curriculum $file.FullName $label
                if (-not $data.rows) {
                    if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out }
                    Write-Host ("{0}: nothing ready, skipped" -f $label)
                    continue
                }
                $lessons = $data.lessons
                $sb = New-Object System.Text.StringBuilder
                [void]$sb.AppendLine("/* Generated by learn/tools/kb_build_learn_js.ps1 from learn/$kindName/$folder/$($file.Name). Do not edit by hand. */")
                [void]$sb.AppendLine("window.$($spec.global) = window.$($spec.global) || {};")
                [void]$sb.AppendLine("window.$($spec.global)[`"$pair`"] = [")
                $empty = 0
                for ($j = 0; $j -lt $lessons.Count; $j++) {
                    $lesson = $lessons[$j]
                    if (-not $lesson.rows.Count) { $empty++ }
                    $rows = ($lesson.rows | ForEach-Object { ConvertTo-JsString $_ }) -join ','
                    $sep = if ($j -lt $lessons.Count - 1) { ',' } else { '' }
                    [void]$sb.AppendLine('  [' + (ConvertTo-JsString $lesson.name) + ',[' + $rows + ']]' + $sep)
                }
                [void]$sb.AppendLine('];')
                [IO.File]::WriteAllText($out, $sb.ToString(), $utf8)
                $notReady = if ($empty) { " ($empty not ready)" } else { '' }
                Write-Host ("{0}: {1} lessons{2}, {3} rows -> learn/data/{4}-{5}.js ({6:N0} bytes)" -f $label, $lessons.Count, $notReady, $data.rows, $spec.prefix, $pair, (Get-Item -LiteralPath $out).Length)
            } catch {
                Write-Warning ("{0}: {1}" -f $label, $_.Exception.Message)
                $failed++
            }
        }
    }
}

# Every pair that has a script is ready, whichever run built it.
$ready = [ordered]@{ alphabet = @(); vocabulary = @(); sentence = @() }
foreach ($script in Get-ChildItem -LiteralPath $outDir -Filter '*.js' | Sort-Object Name) {
    if ($script.BaseName -match '^alphabet-([a-z]{2}-[a-z]{2})$') { $ready.alphabet += $Matches[1] }
    elseif ($script.BaseName -match '^vocab-([a-z]{2}-[a-z]{2})$') { $ready.vocabulary += $Matches[1] }
    elseif ($script.BaseName -match '^sentence-([a-z]{2}-[a-z]{2})$') { $ready.sentence += $Matches[1] }
}
$list = { param($pairs) ($pairs | ForEach-Object { '"' + $_ + '"' }) -join ',' }
$manifest = "/* Generated by learn/tools/kb_build_learn_js.ps1: the UI-language/learned-language pairs that have data. */`n" +
    "window.LEARN_READY = {`n" +
    "  alphabet: [" + (& $list $ready.alphabet) + "],`n" +
    "  vocabulary: [" + (& $list $ready.vocabulary) + "],`n" +
    "  sentence: [" + (& $list $ready.sentence) + "]`n" +
    "};`n"
[IO.File]::WriteAllText((Join-Path $outDir 'ready.js'), $manifest, $utf8)
Write-Host ("ready.js: {0} alphabet pairs, {1} vocabulary pairs, {2} sentence pairs" -f $ready.alphabet.Count, $ready.vocabulary.Count, $ready.sentence.Count)
if ($failed) { Write-Warning "$failed file(s) could not be packed" }
