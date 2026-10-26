$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\account\index.astro"
Say "=== INSPECTING: src/pages/account/index.astro ===" 'HDR'

if (-not (Test-Path -LiteralPath $path)) {
    Say "MISSING: $path" 'FAIL'
    return
}

$content = [System.IO.File]::ReadAllText($path)

# Extract the frontmatter (between --- and ---)
$matches = [regex]::Matches($content, '(?s)^---(.*?)---')
if ($matches.Count -gt 0) {
    Say "--- FRONTMATTER (Server-Side Logic) ---" 'HDR'
    $lines = $matches[0].Groups[1].Value -split "`n"
    $i = 0
    foreach ($line in $lines) {
        $i++
        Say ("  {0,3} | {1}" -f $i, $line)
    }
} else {
    Say "Could not find frontmatter in account/index.astro" 'FAIL'
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
