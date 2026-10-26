$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

$path = "$root\src\pages\account\index.astro"
Say "=== DIAGNOSIS: src/pages/account/index.astro ===" 'HDR'

if (-not (Test-Path -LiteralPath $path)) {
    Say "MISSING: $path" 'FAIL'
    return
}

$content = [System.IO.File]::ReadAllText($path)

# 1. Check frontmatter patches
Say ""
Say "--- 1. FRONTMATTER PATCHES ---" 'HDR'

if ($content -match "select\('is_admin, role, full_name, org_id, org_role'\)") {
    Say "  ✅ Profile query has org_id + org_role" 'OK'
} elseif ($content -match "select\('is_admin, role, full_name'\)") {
    Say "  ❌ Profile query is MISSING org_id + org_role (needs patch)" 'FAIL'
} else {
    Say "  ⚠️  Profile query shape unknown - checking manually" 'WARN'
}

if ($content -match "let orgBookings = \[\]") {
    Say "  ✅ orgBookings variable exists" 'OK'
} else {
    Say "  ❌ orgBookings variable MISSING (needs patch)" 'FAIL'
}

if ($content -match "isOrgManager") {
    Say "  ✅ isOrgManager variable exists" 'OK'
} else {
    Say "  ❌ isOrgManager variable MISSING (needs patch)" 'FAIL'
}

# 2. Check HTML dashboard
Say ""
Say "--- 2. CORPORATE DASHBOARD HTML ---" 'HDR'

if ($content -match "TRAVEL MANAGER VIEW") {
    Say "  ✅ Corporate dashboard ALREADY injected" 'OK'
    Say "  -> You do NOT need to inject again, just deploy." 'OK'
} else {
    Say "  ❌ Corporate dashboard HTML not injected yet" 'FAIL'
}

# 3. Find the exact 'My Bookings' heading
Say ""
Say "--- 3. EXACT HEADING STRINGS FOUND ---" 'HDR'

$headingMatches = [regex]::Matches($content, '<h2[^>]*>[^<]*Bookings[^<]*</h2>')
if ($headingMatches.Count -eq 0) {
    Say "  ❌ No h2 headings containing 'Bookings' found" 'FAIL'
} else {
    foreach ($m in $headingMatches) {
        Say "  Found: $($m.Value)" 'WARN'
    }
}

# 4. Line count around heading
Say ""
Say "--- 4. CONTEXT (3 lines around first 'Bookings' heading) ---" 'HDR'
$idx = $content.IndexOf("Bookings")
if ($idx -gt 0) {
    $lines = $content -split "`n"
    $runningIdx = 0
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $runningIdx += $lines[$i].Length + 1
        if ($runningIdx -ge $idx) {
            $start = [Math]::Max(0, $i - 1)
            $end = [Math]::Min($lines.Count - 1, $i + 3)
            for ($j = $start; $j -le $end; $j++) {
                $marker = if ($j -eq $i) { ">>> " } else { "    " }
                Say "$marker$($lines[$j])"
            }
            break
        }
    }
}

Say ""
Say "=== DIAGNOSIS COMPLETE ===" 'HDR'
