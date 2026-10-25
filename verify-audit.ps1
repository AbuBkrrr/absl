$root = 'C:\Users\DELL\absl'
Set-Location $root

function R {
    param([string]$Msg, [string]$Level = 'INFO')
    $color = switch ($Level) { 'OK' { 'Green' } 'WARN' { 'Yellow' } 'FAIL' { 'Red' } default { 'Gray' } }
    Write-Host $Msg -ForegroundColor $color
}

# === 1. VERIFY [id].astro with -LiteralPath ===
R "`n=== 1. [id].astro VERIFICATION ==="
$idPath = "$root\src\pages\services\[id].astro"
if (Test-Path -LiteralPath $idPath) {
    $size = (Get-Item -LiteralPath $idPath).Length
    R "[ OK ] EXISTS ($size bytes) - audit was a false positive" 'OK'
} else {
    R "[FAIL] TRULY MISSING - 'View & Book' buttons will 404" 'FAIL'
}

# === 2. CART KEY — full scan using .NET (immune to profile overrides) ===
R "`n=== 2. CART KEY FULL SCAN (bypass profile overrides) ==="
$allFiles = Get-ChildItem "$root\src" -Recurse -Include *.astro,*.ts -File -ErrorAction SilentlyContinue
$cartHits = @{}
foreach ($f in $allFiles) {
    try {
        $text = [System.IO.File]::ReadAllText($f.FullName)
    } catch { continue }
    foreach ($m in [regex]::Matches($text, "localStorage\.(?:getItem|setItem|removeItem)\(\s*['""]([^'""]+)['""]")) {
        $k = $m.Groups[1].Value
        if (-not $cartHits.ContainsKey($k)) { $cartHits[$k] = @() }
        $rel = $f.FullName.Replace($root + '\', '')
        if ($cartHits[$k] -notcontains $rel) { $cartHits[$k] += $rel }
    }
}
foreach ($k in $cartHits.Keys) {
    $files = $cartHits[$k] -join ', '
    if ($k -eq 'absl_cart') { R "[ OK ] '$k' in: $files" 'OK' }
    else { R "[WARN] '$k' in: $files" 'WARN' }
}
if ($cartHits.ContainsKey('cart')) {
    R "[FAIL] Bare 'cart' key still used somewhere - EMPTY CART BUG!" 'FAIL'
} else {
    R "[ OK ] No bare 'cart' key - no mismatch" 'OK'
}

# === 3. CONFIRM i18n FILES ARE TRULY ORPHANED ===
R "`n=== 3. i18n ORPHAN VERIFICATION ==="
$i18nRefs = @()
foreach ($f in $allFiles) {
    try { $text = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    if ($f.FullName -match '\\i18n\\|i18n-widget|\\config\.ts$') { continue }  # skip the orphan files themselves
    if ($text -match "i18n-widget|from\s+['""].*\/i18n|from\s+['""].*\/config['""]") {
        $i18nRefs += $f.FullName.Replace($root + '\', '')
    }
}
if ($i18nRefs.Count -eq 0) {
    R "[ OK ] No live file imports i18n-widget, i18n/, or config.ts" 'OK'
} else {
    R "[WARN] Still imported by:" 'WARN'
    $i18nRefs | ForEach-Object { R "         $_" 'WARN' }
}

# === 4. LOCATE Qaraye TABLE REFERENCES (which files?) ===
R "`n=== 4. Qaraye TABLE LOCATIONS ==="
$qarayeTables = @('qm_orders', 'qm_price_signals', 'saved_listings')
foreach ($f in $allFiles) {
    try { $text = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    foreach ($t in $qarayeTables) {
        if ($text -match "\.from\(\s*['""]$t['""]") {
            R "  $($f.FullName.Replace($root + '\', '')) -> $t" 'WARN'
        }
    }
}

# === 5. LOCATE 'portfolio' AND 'profiles' REFERENCES (are they ABSL or Qaraye?) ===
R "`n=== 5. 'portfolio' / 'profiles' TABLE USAGE ==="
foreach ($f in $allFiles) {
    try { $text = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    foreach ($t in @('portfolio', 'profiles')) {
        if ($text -match "\.from\(\s*['""]$t['""]") {
            R "  $($f.FullName.Replace($root + '\', '')) -> .from('$t')" 'INFO'
        }
    }
}

# === 6. ALL BRANDING HITS (full list, not truncated) ===
R "`n=== 6. ALL BRANDING HITS (full) ==="
$bHits = @()
foreach ($f in $allFiles) {
    try { $text = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    $ln = 0
    foreach ($line in $text -split "`n") {
        $ln++
        if ($line -match 'Qaraye|qaraye|qm_|agro|Agro|harvest|Harvest') {
            $bHits += "$($f.FullName.Replace($root + '\', '')):$ln"
        }
    }
}
R "  Total: $($bHits.Count) hit(s)"
$bHits | Group-Object { ($_ -split ':')[0] } | ForEach-Object {
    R "  $($_.Name) -> $($_.Count) hit(s)" 'WARN'
}

R "`n=== VERIFICATION COMPLETE ==="
