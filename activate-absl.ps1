$root = "C:\Users\DELL\absl"
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$backup = "$root\absl_backups\activate-$ts"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$targets = @(
    "src\pages\track.astro",
    "src\pages\checkout\success.astro",
    "src\pages\about.astro",
    "src\pages\privacy.astro",
    "src\pages\terms.astro",
    "src\pages\logistics\quote.astro",
    "src\pages\logistics\warehousing.astro",
    "src\pages\api\rewards\loyalty.ts",
    "src\pages\api\rewards\offers.ts",
    "src\pages\api\rewards\discounts.ts",
    "src\pages\api\rewards\carbon.ts",
    "src\layouts\Layout.astro",
    "src\pages\logistics.astro",
    "src\pages\rc768315.astro"
)

# --- 1. Backup every target file ---
$n = 0
foreach ($t in $targets) {
    $src = Join-Path $root $t
    if (Test-Path -LiteralPath $src) {
        $safe = ($t -replace '[\\\/]', '_')
        Copy-Item -LiteralPath $src -Destination (Join-Path $backup $safe) -Force
        $n++
    }
}
Write-Host "`n[1/5] Backed up $n files to $backup" -ForegroundColor Green

# --- 2. Delete dead test file ---
$rc = "$root\src\pages\rc768315.astro"
if (Test-Path -LiteralPath $rc) {
    Remove-Item -LiteralPath $rc -Force
    Write-Host "[2/5] Deleted: src\pages\rc768315.astro (dead test file)" -ForegroundColor Green
} else {
    Write-Host "[2/5] rc768315.astro already gone" -ForegroundColor Gray
}

# --- 3. Show every Qaraye/qm-cart reference with context ---
Write-Host "`n[3/5] QARAYE REFERENCES BY FILE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
$anyRefs = $false
foreach ($t in $targets | Where-Object { $_ -ne "src\pages\rc768315.astro" }) {
    $src = Join-Path $root $t
    if (-not (Test-Path -LiteralPath $src)) { continue }
    $refs = Select-String -LiteralPath $src -Pattern "Qaraye|qaraye|qm-cart" -ErrorAction SilentlyContinue
    if ($refs) {
        $anyRefs = $true
        Write-Host "`n--- $t" -ForegroundColor Yellow
        foreach ($r in $refs) {
            Write-Host "  L$($r.LineNumber): $($r.Line.Trim())" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n--- $t : CLEAN (no Qaraye)" -ForegroundColor Green
    }
}
if (-not $anyRefs) { Write-Host "  (No Qaraye refs anywhere in targets)" -ForegroundColor Green }

# --- 4. Show current nav + footer links in Layout.astro ---
Write-Host "`n[4/5] CURRENT LINKS IN Layout.astro" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
$layout = [System.IO.File]::ReadAllText("$root\src\layouts\Layout.astro")
[regex]::Matches($layout, 'href="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" }

# --- 5. Show /logistics.astro structure so we know where to cross-link ---
Write-Host "`n[5/5] /logistics.astro — sections & links (for cross-link planning)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
$logi = [System.IO.File]::ReadAllText("$root\src\pages\logistics.astro")
$logiLines = $logi -split "`r?`n"
for ($i = 0; $i -lt $logiLines.Count; $i++) {
    if ($logiLines[$i] -match '<h[1-3]|<section|class="btn|href="/logistics|Freight|Warehous|Quote') {
        Write-Host ("  L{0,3}: {1}" -f ($i+1), $logiLines[$i].Trim())
    }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Backup: $backup"
Write-Host "  Deleted: rc768315.astro"
Write-Host "  Files inspected: $($targets.Count - 1)"
Write-Host "  Next: paste the Qaraye refs + link list above, and I'll write the rebrand script"
