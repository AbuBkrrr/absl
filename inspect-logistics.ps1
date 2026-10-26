$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\logistics.astro"
Say "=== INSPECTING: src/pages/logistics.astro ===" 'HDR'

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

    # Highlight hero section and scripts
    if ($line -match '<section' -or $line -match '</section>' -or $inScript -or $line -match '<div class="container"') {
        if ($line -match 'background:' -or $line -match '<h1' -or $line -match '<script' -or $line -match 'fetch\(') {
            Say ("  {0,4} | {1}" -f $i, $line) 'WARN'
        } else {
            Say ("  {0,4} | {1}" -f $i, $line)
        }
    }
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
