# Read hook input from stdin
$inputJson = [Console]::In.ReadToEnd()
$data = $inputJson | ConvertFrom-Json

# Extract useful info
$sessionId = $data.session_id
$cwd = $data.cwd
$projectName = Split-Path $cwd -Leaf

# Build timestamp
$time = Get-Date -Format "HH:mm:ss"

# Try to read task summary from file (if exists)
$summaryFile = Join-Path $cwd ".claude/task-summary.txt"
$taskSummary = ""
if (Test-Path $summaryFile) {
    $taskSummary = Get-Content $summaryFile -Raw -ErrorAction SilentlyContinue
    $taskSummary = $taskSummary.Trim()
    # Clear the summary after reading
    Remove-Item $summaryFile -ErrorAction SilentlyContinue
}

# If no summary, check for recently modified files
if (-not $taskSummary) {
    Push-Location $cwd
    try {
        $recentFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) -and $_.FullName -notmatch '\.git|node_modules|\.claude' } |
            Select-Object -First 3 -ExpandProperty Name
        if ($recentFiles) {
            $taskSummary = "Modified: " + ($recentFiles -join ", ")
        }
    } catch {}
    Pop-Location
}

# Fallback message
if (-not $taskSummary) {
    $taskSummary = "Ready for next task"
}

# Build notification
$title = "Claude Code - $projectName"
$message = "Completed at $time`n$taskSummary"

# Play attention-grabbing sound
$soundPath = "$env:SystemRoot\Media\notify.wav"
if (Test-Path $soundPath) {
    (New-Object Media.SoundPlayer $soundPath).PlaySync()
}

# Show balloon notification
Add-Type -AssemblyName System.Windows.Forms
$balloon = New-Object System.Windows.Forms.NotifyIcon
$balloon.Icon = [System.Drawing.SystemIcons]::Information
$balloon.BalloonTipIcon = 'Info'
$balloon.BalloonTipTitle = $title
$balloon.BalloonTipText = $message
$balloon.Visible = $true
$balloon.ShowBalloonTip(10000)

Start-Sleep -Seconds 5
$balloon.Dispose()
