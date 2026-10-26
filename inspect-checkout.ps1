$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\checkout\index.astro"
Say "=== INSPECTING: src/pages/checkout/index.astro ===" 'HDR'

if (-not (Test-Path -LiteralPath $path)) {
    Say "MISSING: $path" 'FAIL'
    return
}

$lines = [System.IO.File]::ReadAllLines($path)
$i = 0
$inScript = $false

foreach ($line in $lines) {
    $i++
    
    # Toggle script block
    if ($line -match '<script') { $inScript = $true }
    if ($line -match '</script>') { $inScript = $false }

    # Highlight form fields, fetch calls, and script logic
    if ($line -match '<input|<select|<textarea' -or $inScript -or $line -match '<form') {
        if ($line -match 'f-name' -or $line -match 'f-phone' -or $line -match 'f-email' -or $line -match 'f-location' -or $line -match 'fetch\(' -or $line -match 'body:' -or $line -match '<script') {
            Say ("  {0,4} | {1}" -f $i, $line) 'WARN'
        } else {
            Say ("  {0,4} | {1}" -f $i, $line)
        }
    }
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
