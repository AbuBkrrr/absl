$root = 'C:\Users\DELL\absl'
Set-Location $root

function Show {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

function Dump-File {
    param([string]$Path, [int]$MaxLines = 250)
    if (-not (Test-Path -LiteralPath $Path)) { Show "  MISSING: $Path" 'FAIL'; return }
    $info = New-Object System.IO.FileInfo($Path)
    $lines = [System.IO.File]::ReadAllLines($Path)
    Show "  Size: $($info.Length) bytes | Lines: $($lines.Count)"
    $i = 0
    foreach ($line in $lines) {
        $i++
        if ($i -gt $MaxLines) { Show "  ... ($($lines.Count - $MaxLines) more lines)"; break }
        Show ("  {0,4} | {1}" -f $i, $line)
    }
}

Show ""
Show "=== 1. src/pages/api/bookings/create.ts ===" 'HDR'
Dump-File "$root\src\pages\api\bookings\create.ts"

Show ""
Show "=== 2. src/pages/api/bookings/update.ts ===" 'HDR'
Dump-File "$root\src\pages\api\bookings\update.ts"

Show ""
Show "=== 3. src/pages/api/shipments/update.ts ===" 'HDR'
if (Test-Path -LiteralPath "$root\src\pages\api\shipments\update.ts") {
    Dump-File "$root\src\pages\api\shipments\update.ts"
} else {
    Show "  (does not exist)" 'WARN'
}

Show ""
Show "=== 4. src/lib/supabase.ts ===" 'HDR'
Dump-File "$root\src\lib\supabase.ts"

Show ""
Show "=== 5. package.json deps & scripts ===" 'HDR'
try {
    $pkg = [System.IO.File]::ReadAllText("$root\package.json") | ConvertFrom-Json
    Show "  Name: $($pkg.name)"
    Show "  --- dependencies ---"
    $pkg.dependencies.PSObject.Properties | ForEach-Object { Show "    $($_.Name): $($_.Value)" }
    Show "  --- devDependencies ---"
    $pkg.devDependencies.PSObject.Properties | ForEach-Object { Show "    $($_.Name): $($_.Value)" }
} catch { Show "  Failed: $_" 'FAIL' }

Show ""
Show "=== 6. .env KEYS (values masked) ===" 'HDR'
if (Test-Path -LiteralPath "$root\.env") {
    $lines = [System.IO.File]::ReadAllLines("$root\.env")
    foreach ($line in $lines) {
        if ($line -match '^\s*#') { continue }
        if ($line -match '^\s*$') { continue }
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') { Show "  $($matches[1]) = ***" }
    }
} else { Show "  .env not found" 'FAIL' }

Show ""
Show "=== 7. Existing email/SMS helper references in src/ ===" 'HDR'
$hits = @()
foreach ($f in (Get-ChildItem "$root\src" -Recurse -Include *.ts,*.astro -File -ErrorAction SilentlyContinue)) {
    try { $t = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    foreach ($pat in @('resend','nodemailer','sendgrid','sendEmail','sendMail','termii','Termii','africastalking','sendWhatsApp','sendSms','notify(')) {
        if ($t.IndexOf($pat, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $hits += "$($f.FullName.Replace($root + '\', '')) :: $pat"
        }
    }
}
if ($hits.Count -eq 0) { Show "  None found (no email/SMS infra yet)" 'WARN' }
else { $hits | Select-Object -Unique | ForEach-Object { Show "  $_" 'WARN' } }

Show ""
Show "=== 8. absl_rewards_loyalty INSERT shape found in code ===" 'HDR'
$foundInsert = $false
foreach ($f in (Get-ChildItem "$root\src" -Recurse -Include *.ts,*.astro -File -ErrorAction SilentlyContinue)) {
    try { $t = [System.IO.File]::ReadAllText($f.FullName) } catch { continue }
    if ($t -match "from\('absl_rewards_loyalty'\)") {
        Show "  File: $($f.FullName.Replace($root + '\', ''))" 'OK'
        $foundInsert = $true
        $lines = $t -split "`n"
        $idx = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "\.insert\(") { $idx = $i; break }
        }
        if ($idx -ge 0) {
            $end = [Math]::Min($idx + 20, $lines.Count)
            for ($i = $idx; $i -lt $end; $i++) { Show "    $($lines[$i].TrimEnd())" }
        }
    }
}
if (-not $foundInsert) { Show "  No absl_rewards_loyalty usage found" 'WARN' }

Show ""
Show "=== 9. absl_bookings insert fields present in create.ts ===" 'HDR'
if (Test-Path -LiteralPath "$root\src\pages\api\bookings\create.ts") {
    $c = [System.IO.File]::ReadAllText("$root\src\pages\api\bookings\create.ts")
    foreach ($fld in @('user_id','customer_name','customer_phone','customer_email','delivery_location','notes','items','total_amount','payment_status','booking_status')) {
        if ($c -match [regex]::Escape($fld)) { Show "  OK  $fld" 'OK' } else { Show "  missing  $fld" 'WARN' }
    }
}

Show ""
Show "=== 10. Git state ===" 'HDR'
$b = (& git rev-parse --abbrev-ref HEAD 2>$null)
Show "  Branch: $b"
$s = (& git status --porcelain 2>$null)
if ($s) {
    $cnt = ($s | Measure-Object).Count
    Show "  UNCOMMITTED ($cnt):" 'WARN'
    $s | Select-Object -First 15 | ForEach-Object { Show "    $_" 'WARN' }
} else { Show "  Working tree clean" 'OK' }
$lc = (& git log -1 --pretty=format:'%h %s' 2>$null)
Show "  HEAD: $lc"

Show ""
Show "=== INSPECTION COMPLETE ===" 'HDR'
