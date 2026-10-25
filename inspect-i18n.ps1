$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $color = switch ($Level) { 'OK' { 'Green' } 'WARN' { 'Yellow' } 'FAIL' { 'Red' } 'HDR' { 'Cyan' } default { 'Gray' } }
    Write-Host $Msg -ForegroundColor $color
}

$files = @(
    "$root\src\config.ts",
    "$root\src\i18n\translations.ts",
    "$root\src\scripts\i18n-widget.ts"
)

Say "=== FILE CONTENTS + EXPORTS ===" 'HDR'
foreach ($f in $files) {
    Say ""
    Say "----- $($f.Replace($root + '\', '')) -----" 'HDR'
    if (-not (Test-Path -LiteralPath $f)) {
        Say "  MISSING" 'FAIL'
        continue
    }
    $size = (Get-Item -LiteralPath $f).Length
    Say "  Size: $size bytes"
    $lines = [System.IO.File]::ReadAllLines($f)
    Say "  Lines: $($lines.Count)"
    Say "  --- exports detected ---"
    $exports = @()
    foreach ($line in $lines) {
        if ($line -match '^\s*export\s+(const|let|var|function|class|interface|type|default)\s+(\w+)?') {
            $exports += $line.Trim()
        }
    }
    if ($exports.Count -eq 0) { Say "    (none found)" 'WARN' }
    else { $exports | ForEach-Object { Say "    $_" } }
    Say "  --- first 25 lines preview ---"
    $lines | Select-Object -First 25 | ForEach-Object { Say "    $_" }
    if ($lines.Count -gt 25) { Say "    ... ($($lines.Count - 25) more lines)" 'WARN' }
}

Say ""
Say "=== WHO IMPORTS THESE FILES? (reverse check) ===" 'HDR'
$allFiles = Get-ChildItem "$root\src" -Recurse -Include *.astro,*.ts -File -ErrorAction SilentlyContinue
$orphanNames = @('config', 'i18n/translations', 'translations', 'i18n-widget')
$importers = @{}
foreach ($f in $allFiles) {
    $rel = $f.FullName.Replace($root + '\', '')
    if ($rel -match '^src\\config\.ts$' -or $rel -match '^src\\i18n\\' -or $rel -match 'i18n-widget\.ts$') { continue }
    try { $text = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    foreach ($pat in @('/config', '/i18n/translations', '/i18n"', '/i18n''', 'i18n-widget')) {
        if ($text -match [regex]::Escape($pat)) {
            if (-not $importers.ContainsKey($rel)) { $importers[$rel] = @() }
            if ($importers[$rel] -notcontains $pat) { $importers[$rel] += $pat }
        }
    }
}
if ($importers.Count -eq 0) {
    Say "  ✅ NO live file imports these three files" 'OK'
    Say "  (They are truly orphaned — safe to rebrand or delete)" 'OK'
} else {
    Say "  ⚠️ The following files STILL import them:" 'WARN'
    foreach ($k in $importers.Keys) {
        Say "    $k  ->  $($importers[$k] -join ', ')" 'WARN'
    }
    Say "  → Preserve export names when rebranding!" 'WARN'
}

Say ""
Say "=== TABLE REFERENCES (are these in the orphan files only?) ===" 'HDR'
foreach ($f in $files) {
    if (-not (Test-Path -LiteralPath $f)) { continue }
    $text = [System.IO.File]::ReadAllText($f)
    foreach ($t in @('qm_orders', 'qm_price_signals', 'saved_listings', 'Qaraye', 'harvest', 'agro')) {
        $count = ([regex]::Matches($text, [regex]::Escape($t))).Count
        if ($count -gt 0) {
            Say "  $($f.Replace($root + '\', '')) :: $t -> $count hit(s)" 'WARN'
        }
    }
}

Say ""
Say "=== INSPECTION COMPLETE — ready to rebrand based on findings ===" 'HDR'
