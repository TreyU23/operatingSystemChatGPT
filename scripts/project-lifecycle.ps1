param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("restart", "shutdown")]
    [string]$Action,

    [Parameter(Mandatory = $true)]
    [string]$WorkspaceRoot
)

$ErrorActionPreference = "Stop"

$resolvedWorkspace = (Resolve-Path -LiteralPath $WorkspaceRoot).Path
$expectedBackend = Join-Path $resolvedWorkspace "scripts\run-backend.ps1"
$expectedFrontend = Join-Path $resolvedWorkspace "scripts\run-frontend.ps1"

foreach ($scriptPath in @($expectedBackend, $expectedFrontend)) {
    $resolvedScript = (Resolve-Path -LiteralPath $scriptPath).Path
    if (-not $resolvedScript.StartsWith($resolvedWorkspace, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Lifecycle script escaped the project workspace."
    }
}

Start-Sleep -Milliseconds 1200

$allProcesses = @(Get-CimInstance Win32_Process)
$byPid = @{}
foreach ($item in $allProcesses) {
    $byPid[[int]$item.ProcessId] = $item
}

$protectedIds = [System.Collections.Generic.HashSet[int]]::new()
[void]$protectedIds.Add([int]$PID)
$changed = $true
while ($changed) {
    $changed = $false
    foreach ($process in $allProcesses) {
        if ($protectedIds.Contains([int]$process.ParentProcessId) -and -not $protectedIds.Contains([int]$process.ProcessId)) {
            [void]$protectedIds.Add([int]$process.ProcessId)
            $changed = $true
        }
    }
}

$targetIds = [System.Collections.Generic.HashSet[int]]::new()
$listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in @(4173, 4317) })

foreach ($listener in $listeners) {
    $currentPid = [int]$listener.OwningProcess
    $depth = 0
    while ($currentPid -gt 0 -and $byPid.ContainsKey($currentPid) -and $depth -lt 8) {
        $process = $byPid[$currentPid]
        if ($process.Name -notin @("node.exe", "java.exe", "cmd.exe", "powershell.exe", "pwsh.exe")) {
            break
        }
        if (-not $protectedIds.Contains($currentPid)) {
            [void]$targetIds.Add($currentPid)
        }
        $currentPid = [int]$process.ParentProcessId
        $depth++
    }
}

$changed = $true
while ($changed) {
    $changed = $false
    foreach ($process in $allProcesses) {
        $processId = [int]$process.ProcessId
        if ($targetIds.Contains([int]$process.ParentProcessId) -and
            -not $targetIds.Contains($processId) -and
            -not $protectedIds.Contains($processId)) {
            [void]$targetIds.Add($processId)
            $changed = $true
        }
    }
}

foreach ($targetId in @($targetIds)) {
    Stop-Process -Id $targetId -Force -ErrorAction SilentlyContinue
}

$deadline = (Get-Date).AddSeconds(12)
do {
    $remaining = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -in @(4173, 4317) })
    if ($remaining.Count -eq 0) {
        break
    }
    Start-Sleep -Milliseconds 350
} while ((Get-Date) -lt $deadline)

if ($remaining.Count -gt 0) {
    throw "Project ports did not close cleanly."
}

if ($Action -eq "shutdown") {
    Write-Output "[$(Get-Date -Format o)] Frontend and backend stopped."
    exit 0
}

$backendOut = Join-Path $resolvedWorkspace ".backend-preview.out.log"
$backendErr = Join-Path $resolvedWorkspace ".backend-preview.err.log"
$frontendOut = Join-Path $resolvedWorkspace ".frontend-preview.out.log"
$frontendErr = Join-Path $resolvedWorkspace ".frontend-preview.err.log"

$backendCommand = "& '$expectedBackend'"
$backendEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($backendCommand))
$frontendCommand = "& '$expectedFrontend'"
$frontendEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($frontendCommand))

Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-EncodedCommand", $backendEncoded) `
    -WorkingDirectory $resolvedWorkspace `
    -WindowStyle Hidden `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null

Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-EncodedCommand", $frontendEncoded) `
    -WorkingDirectory $resolvedWorkspace `
    -WindowStyle Hidden `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr | Out-Null

Write-Output "[$(Get-Date -Format o)] Frontend and backend restart requested."
