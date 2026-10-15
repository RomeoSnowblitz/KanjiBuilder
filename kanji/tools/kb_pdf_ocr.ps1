# Renders a scanned PDF page by page with Windows.Data.Pdf and OCRs it with Windows.Media.Ocr.
# Writes one text document with "=== Page N ===" markers, and keeps the page images for checking.
# Usage: .\kb_pdf_ocr.ps1 -Pdf <file.pdf> -Out <file.txt> -ImageDir <folder> [-Language zh-Hans-CN] [-Scale 3] [-FirstPage 1] [-LastPage 0]
param(
  [Parameter(Mandatory = $true)][string]$Pdf,
  [Parameter(Mandatory = $true)][string]$Out,
  [Parameter(Mandatory = $true)][string]$ImageDir,
  [string]$Language = "zh-Hans-CN",
  [double]$Scale = 3,
  [int]$FirstPage = 1,
  [int]$LastPage = 0
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$asTaskOperation = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
} | Select-Object -First 1
$asTaskAction = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncAction"
} | Select-Object -First 1

function Await($operation, [Type]$resultType) {
  $task = $asTaskOperation.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $null = $task.Wait(-1)
  return $task.Result
}

function AwaitAction($action) {
  $task = $asTaskAction.Invoke($null, @($action))
  $null = $task.Wait(-1)
}

$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language $Language))
if (-not $ocr) { throw "No OCR recognizer installed for $Language" }

New-Item -ItemType Directory -Force -Path $ImageDir | Out-Null
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Pdf).Path)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$pageCount = [int]$doc.PageCount
if ($LastPage -le 0 -or $LastPage -gt $pageCount) { $LastPage = $pageCount }

# Windows OCR puts a space between every CJK character; join them back without touching Latin words.
$cjkGap = New-Object System.Text.RegularExpressions.Regex "(?<=[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F])\s+(?=[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F])"

$builder = New-Object System.Text.StringBuilder
for ($n = $FirstPage; $n -le $LastPage; $n++) {
  $page = $doc.GetPage([uint32]($n - 1))
  $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $options.DestinationWidth = [uint32][math]::Round($page.Size.Width * $Scale)
  $options.DestinationHeight = [uint32][math]::Round($page.Size.Height * $Scale)
  $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitAction ($page.RenderToStreamAsync($stream, $options))

  $stream.Seek(0)
  $png = Join-Path $ImageDir ("page{0:D3}.png" -f $n)
  $netStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
  $fileStream = [System.IO.File]::Create($png)
  $netStream.CopyTo($fileStream)
  $fileStream.Dispose()

  $stream.Seek(0)
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

  $null = $builder.AppendLine("=== Page $n ===")
  foreach ($line in $result.Lines) {
    $null = $builder.AppendLine($cjkGap.Replace($line.Text, ""))
  }
  $null = $builder.AppendLine()
  $bitmap.Dispose()
  $stream.Dispose()
  $page.Dispose()
  Write-Host ("page {0}/{1}: {2} lines" -f $n, $LastPage, @($result.Lines).Count)
}

[System.IO.File]::WriteAllText($Out, $builder.ToString(), (New-Object System.Text.UTF8Encoding $false))
Write-Host "wrote $Out"
