$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\api\travel-book.ts"

Say "=== INSPECTING: src/pages/api/travel-book.ts ===" 'HDR'
if (-not (Test-Path -LiteralPath $path)) {
    Say "MISSING: $path" 'FAIL'
    return
}

$lines = [System.IO.File]::ReadAllLines($path)
$i = 0
foreach ($line in $lines) {
    $i++
    Say ("  {0,4} | {1}" -f $i, $line)
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
