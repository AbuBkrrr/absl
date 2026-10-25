$root = "C:\Users\DELL\absl"
Set-Location $root

Write-Host "`n=== FIX 1: Unify cart.ts KEY ===" -ForegroundColor Cyan
$cartTs = Join-Path $root "src\scripts\cart.ts"
if (Test-Path -LiteralPath $cartTs) {
    $content = [System.IO.File]::ReadAllText($cartTs)
    $before = [regex]::Match($content, "const\s+KEY\s*=\s*'([^']+)'").Groups[1].Value
    Write-Host "  Current KEY: '$before'" -ForegroundColor Gray
    if ($before -eq "absl_cart") {
        Write-Host "  Already unified - nothing to do" -ForegroundColor Gray
    } else {
        $content = $content -replace "const\s+KEY\s*=\s*'[^']+'", "const KEY = 'absl_cart'"
        [System.IO.File]::WriteAllText($cartTs, $content)
        Write-Host "  Changed: '$before' -> 'absl_cart'" -ForegroundColor Green
    }
} else {
    Write-Host "  cart.ts NOT FOUND" -ForegroundColor Red
}

Write-Host "`n=== FIX 2: Add AdminGuard to 3 pages ===" -ForegroundColor Cyan
@("rewards.astro","shipments.astro","travel.astro") | ForEach-Object {
    $p = Join-Path $root "src\pages\admin\$_"
    if (-not (Test-Path -LiteralPath $p)) {
        Write-Host "  $_ : missing - skipped" -ForegroundColor Yellow
        return
    }
    $c = [System.IO.File]::ReadAllText($p)
    if ($c -match "AdminGuard") {
        Write-Host "  $_ : already protected" -ForegroundColor Gray
        return
    }
    $imp = "import Layout from '../../layouts/Layout.astro';"
    if ($c -match [regex]::Escape($imp)) {
        $c = $c.Replace($imp, $imp + "`nimport AdminGuard from '../../components/AdminGuard.astro';")
        $c = $c -replace "(<Layout[^>]*>)", "`$1`n  <AdminGuard />"
        [System.IO.File]::WriteAllText($p, $c)
        Write-Host "  $_ : guard added" -ForegroundColor Green
    } else {
        Write-Host "  $_ : Layout import not in expected form - manual fix needed" -ForegroundColor Yellow
    }
}

Write-Host "`n=== VERIFY ===" -ForegroundColor Cyan
$final = Get-Content (Join-Path $root "src\scripts\cart.ts") -Raw
if ($final -match "const\s+KEY\s*=\s*'absl_cart'") {
    Write-Host "  OK cart.ts KEY = 'absl_cart'" -ForegroundColor Green
} else {
    Write-Host "  FAIL cart.ts KEY not unified" -ForegroundColor Red
}

$leftovers = Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.astro,*.ts -ErrorAction SilentlyContinue |
    Select-String -Pattern "['""](qm-cart)['""]" -List
if ($leftovers) {
    Write-Host "  WARN: qm-cart still referenced:" -ForegroundColor Yellow
    $leftovers | ForEach-Object { Write-Host "    $($_.Path)" -ForegroundColor Yellow }
} else {
    Write-Host "  OK: no 'qm-cart' references remain" -ForegroundColor Green
}

Write-Host "`nDone." -ForegroundColor Cyan
