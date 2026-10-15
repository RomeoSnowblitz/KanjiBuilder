# OCRs table pages one column at a time, so numbers stay on the same line as their characters.
# Columns are split at the vertical divider lines found in each page image (from kb_pdf_ocr.ps1 -ImageDir).
# Writes the same "=== Page N ===" format as kb_pdf_ocr.ps1, with each column's lines in reading order.
# Usage: .\kb_column_ocr.ps1 -ImageDir <folder> -Out <file.txt> -FirstPage 77 -LastPage 109 [-Language zh-Hans-CN]
param(
  [Parameter(Mandatory = $true)][string]$ImageDir,
  [Parameter(Mandatory = $true)][string]$Out,
  [Parameter(Mandatory = $true)][int]$FirstPage,
  [Parameter(Mandatory = $true)][int]$LastPage,
  [string]$Language = "zh-Hans-CN",
  [double]$Zoom = 1
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$asTaskOperation = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
} | Select-Object -First 1

function Await($operation, [Type]$resultType) {
  $task = $asTaskOperation.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $null = $task.Wait(-1)
  return $task.Result
}

$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language $Language))
if (-not $ocr) { throw "No OCR recognizer installed for $Language" }
$ImageDir = (Resolve-Path $ImageDir).Path
$Out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
$cjkGap = New-Object System.Text.RegularExpressions.Regex "(?<=[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F])\s+(?=[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F])"

function Find-Dividers([System.Drawing.Bitmap]$image) {
  # A divider is a run of x positions that are dark for most of the page's middle band.
  $rect = New-Object System.Drawing.Rectangle 0, 0, $image.Width, $image.Height
  $data = $image.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $bytes = New-Object byte[] ($data.Stride * $image.Height)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $image.UnlockBits($data)
  $top = [int]($image.Height * 0.2)
  $bottom = [int]($image.Height * 0.8)
  $rows = [math]::Floor(($bottom - $top) / 4)
  $dividers = New-Object System.Collections.Generic.List[int]
  $runStart = -1
  for ($x = 0; $x -le $image.Width; $x++) {
    $dark = 0
    if ($x -lt $image.Width) {
      for ($y = $top; $y -lt $bottom; $y += 4) {
        $i = $y * $data.Stride + $x * 3
        if (($bytes[$i] + $bytes[$i + 1] + $bytes[$i + 2]) -lt 450) { $dark++ }
      }
    }
    if ($dark -gt $rows * 0.6) { if ($runStart -lt 0) { $runStart = $x } }
    elseif ($runStart -ge 0) { $dividers.Add([int](($runStart + $x - 1) / 2)); $runStart = -1 }
  }
  return $dividers
}

function Read-Region([System.Drawing.Bitmap]$image, [int]$left, [int]$right) {
  $width = [int](($right - $left) * $Zoom)
  $height = [int]($image.Height * $Zoom)
  $crop = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($crop)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle 0, 0, $width, $height), (New-Object System.Drawing.Rectangle $left, 0, ($right - $left), $image.Height), [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  $memory = New-Object System.IO.MemoryStream
  $crop.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
  $memory.Position = 0
  $stream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($memory)
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $lines = @($result.Lines | ForEach-Object { $cjkGap.Replace($_.Text, "") })
  $bitmap.Dispose()
  $stream.Dispose()
  return $lines
}

$builder = New-Object System.Text.StringBuilder
for ($n = $FirstPage; $n -le $LastPage; $n++) {
  $image = New-Object System.Drawing.Bitmap (Join-Path $ImageDir ("page{0:D3}.png" -f $n))
  $dividers = @(Find-Dividers $image)
  $edges = @(0) + $dividers + @($image.Width)
  $null = $builder.AppendLine("=== Page $n ===")
  $count = 0
  for ($c = 0; $c -lt $edges.Count - 1; $c++) {
    foreach ($line in (Read-Region $image ($edges[$c] + 3) ($edges[$c + 1] - 3))) { $null = $builder.AppendLine($line); $count++ }
  }
  $null = $builder.AppendLine()
  $image.Dispose()
  Write-Host ("page {0}: {1} columns, {2} lines" -f $n, ($edges.Count - 1), $count)
}

[System.IO.File]::WriteAllText($Out, $builder.ToString(), (New-Object System.Text.UTF8Encoding $false))
Write-Host "wrote $Out"
