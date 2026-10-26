$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$files = @(
    "$root\src\pages\rewards\index.astro",
    "$root\src\pages\api\bookings\create.ts",
    "$root\src\pages\api\travel-book.ts"
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
    $inScript = $false
    
    foreach ($line in $lines) {
        $i++
        
        # Toggle script block
        if ($line -match '<script') { $inScript = $true }
        if ($line -match '</script>') { $inScript = $false }

        # Highlight relevant logic
        if ($inScript -or $line -match 'dashboard-hero' -or $line -match 'total-miles' -or $line -match 'user_id:' -or $line -match 'absl_rewards_loyalty') {
            if ($line -match 'total-miles' -or $line -match 'user_id:' -or $line -match 'loyalty' -or $line -match 'dashboard-hero') {
                Say ("  {0,4} | {1}" -f $i, $line) 'WARN'
            } else {
                Say ("  {0,4} | {1}" -f $i, $line)
            }
        }
    }
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
