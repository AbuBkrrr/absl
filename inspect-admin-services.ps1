$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\admin\services.astro"
Say "=== INSPECTING: src/pages/admin/services.astro ===" 'HDR'

if (-not (Test-Path -LiteralPath $path)) {
    Say "MISSING: $path" 'FAIL'
    return
}

$lines = [System.IO.File]::ReadAllLines($path)
$i = 0
$inForm = $false
$inScript = $false

foreach ($line in $lines) {
    $i++
    # Highlight form inputs
    if ($line -match '<input|<select|<textarea|<button id="save-btn"') {
        Say ("  {0,4} | {1}" -f $i, $line) 'WARN'
    }
    # Highlight the insert call in the script
    elseif ($line -match '\.insert\(' -or $line -match 'f-title' -or $line -match 'f-price' -or $line -match 'f-desc') {
        Say ("  {0,4} | {1}" -f $i, $line) 'OK'
    }
    # Show generic lines to keep context
    else {
        Say ("  {0,4} | {1}" -f $i, $line)
    }
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
