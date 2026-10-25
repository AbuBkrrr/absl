$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\travel.astro"
Say "=== INSPECTING: src/pages/travel.astro (Script Section Only) ===" 'HDR'

if (-not (Test-Path -LiteralPath $path)) {
    Say "MISSING: $path" 'FAIL'
    return
}

$content = [System.IO.File]::ReadAllText($path)

# Find the <script> tag and extract it
if ($content -match '(?s)<script>(.*?)</script>') {
    $scriptContent = $matches[1]
    Say "--- SCRIPT BLOCK ---" 'HDR'
    $lines = $scriptContent -split "`n"
    $i = 0
    foreach ($line in $lines) {
        $i++
        # Highlight the fetch line if found
        if ($line -match 'fetch') {
            Say ("  {0,4} | {1}" -f $i, $line) 'WARN'
        } else {
            Say ("  {0,4} | {1}" -f $i, $line)
        }
    }
} else {
    Say "No <script> block found in travel.astro" 'FAIL'
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
