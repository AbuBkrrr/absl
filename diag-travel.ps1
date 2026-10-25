$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

Say "=== 1. FULL CONTENTS OF travel.astro ===" 'HDR'
$path = "$root\src\pages\travel.astro"
if (Test-Path -LiteralPath $path) {
    $lines = [System.IO.File]::ReadAllLines($path)
    $i = 0
    foreach ($line in $lines) {
        $i++
        Say ("  {0,4} | {1}" -f $i, $line)
    }
} else {
    Say "MISSING: $path" 'FAIL'
}

Say ""
Say "=== 2. SEARCHING ALL OF src/ FOR 'api/travel-book' ===" 'HDR'
$allFiles = Get-ChildItem "$root\src" -Recurse -Include *.astro,*.ts,*.js -File -ErrorAction SilentlyContinue
$found = $false
foreach ($f in $allFiles) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    if ($text -match 'api/travel-book') {
        $found = $true
        Say "  Found in: $($f.FullName.Replace($root + '\', ''))" 'WARN'
        # Print the lines containing the fetch
        $fileLines = $text -split "`n"
        $ln = 0
        foreach ($line in $fileLines) {
            $ln++
            if ($line -match 'travel-book') {
                Say "    L$ln : $($line.Trim())" 'WARN'
            }
        }
    }
}
if (-not $found) {
    Say "  Not found anywhere in src/!" 'FAIL'
}

Say ""
Say "=== 3. SCRIPT TAGS IN travel.astro ===" 'HDR'
$travelText = [System.IO.File]::ReadAllText($path)
$scriptMatches = [regex]::Matches($travelText, '<script[^>]*>')
if ($scriptMatches.Count -eq 0) {
    Say "  No <script> tags found at all." 'FAIL'
} else {
    foreach ($m in $scriptMatches) {
        Say "  Found: $($m.Value)" 'OK'
    }
}

Say ""
Say "=== DIAGNOSIS COMPLETE ===" 'HDR'
