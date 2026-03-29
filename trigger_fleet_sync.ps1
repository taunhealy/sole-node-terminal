# 🏹 SOLESEEK: MANUAL FLEET SYNC UTILITY
# Full Synchronization: Scraper Scans, Drop Radar, AI Overwatch.

$url = "https://solenode-api-256432107914.africa-south1.run.app/api/v1/automation/run-all"
$key = "SOLE_SEEK_AUTO_2026_TAC"

$headers = @{
    "X-Automation-Key" = $key
    "Accept" = "application/json"
}

Write-Host "⚡ INITIATING_FLEET_COMMAND_SYNC..."

try {
    $res = Invoke-RestMethod -Uri "$url?key=$key" -Method Get -Headers $headers
    
    if ($res.status -eq "fleet_sync_complete") {
        Write-Host "✅ SYNC_SUCCESSFUL!"
        Write-Host "📦 Drops Synced: $($res.drops_synced)"
        Write-Host "👟 SOTD Selected: $($res.sneaker_of_the_day)"
    } else {
        Write-Host "⚠️ UNRECOGNIZED_RESPONSE"
    }
} catch {
    Write-Host "❌ SYNC_CRITICAL_FAILURE: $($_.Exception.Message)"
}

Write-Host "MISSION_END."
