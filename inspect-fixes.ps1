$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$files = @(
    "$root\src\pages\checkout\index.astro",
    "$root\src\pages\admin\bookings.astro"
)

foreach ($path in $files) {
    Say ""
    Say "=== INSPECTING: $($path.Replace($root + '\', '')) ===" 'HDR'
    
    if (-not (Test-Path -LiteralPath $path)) {
        Say "MISSING: $path" 'FAIL'
        continue
    }

    $lines = [System.IO.File]::ReadAllLines($path)
    $i = 0
    
    # We only care about the <script> block and table headers in these files
    $inScript = $false
    
    foreach ($line in $lines) {
        $i++
        
        # Toggle script block
        if ($line -match '<script') { $inScript = $true }
        if ($line -match '</script>') { $inScript = $false }

        # Highlight relevant logic
        if ($inScript -or $line -match '<th' -or $line -match 'items' -or $line -match 'fetch\(') {
            if ($line -match 'fetch\(' -or $line -match 'headers' -or $line -match 'body:' -or $line -match '<th' -or $line -match 'items') {
                Say ("  {0,4} | {1}" -f $i, $line) 'WARN'
            } else {
                Say ("  {0,4} | {1}" -f $i, $line)
            }
        }
    }
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
