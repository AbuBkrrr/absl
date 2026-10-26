$root = 'C:\Users\DELL\absl'
Set-Location $root

function Say {
    param([string]$Msg, [string]$Level = 'INFO')
    $c = switch ($Level) { 'OK' {'Green'} 'WARN' {'Yellow'} 'FAIL' {'Red'} 'HDR' {'Cyan'} default {'Gray'} }
    Write-Host $Msg -ForegroundColor $c
}

Say "=== 1. CHECKING FOR vercel.json ===" 'HDR'
if (Test-Path -LiteralPath "$root\vercel.json") {
    Say "Found vercel.json" 'OK'
    Say ([System.IO.File]::ReadAllText("$root\vercel.json"))
} else {
    Say "No vercel.json found. We will need to create one." 'WARN'
}

Say ""
Say "=== 2. CHECKING HOW DETAILS ARE SAVED in travel-book.ts ===" 'HDR'
$travelApi = [System.IO.File]::ReadAllText("$root\src\pages\api\travel-book.ts")
# Look for the insert statement to see the structure
if ($travelApi -match 'details: body.details') {
    Say "The API saves the raw JSON object sent from the form." 'OK'
    Say "We will query the JSON keys like 'DEPARTURE' or 'Departure'." 'INFO'
} else {
    Say "Could not definitively determine how details are saved. Let's look at the frontend." 'WARN'
}

Say ""
Say "=== 3. CHECKING FRONTEND LABELS in travel.astro ===" 'HDR'
$travelPage = [System.IO.File]::ReadAllText("$root\src\pages\travel.astro")
$matches = [regex]::Matches($travelPage, 'label[^>]*>([^<]+)</label>\s*<input[^>]+class="t-input"')
foreach ($m in $matches) {
    Say "  Form Label: $($m.Groups[1].Value.Trim())"
}

Say ""
Say "=== INSPECTION COMPLETE ===" 'HDR'
