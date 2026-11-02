$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $Root '.env.local'))) { throw 'Run .\setup-gigsy.ps1 first.' }
$semantic = "Set-Location '$Root'; .\start-semantic.ps1"
$web = "Start-Sleep -Seconds 8; Set-Location '$Root'; .\start-gigsy.ps1"
Start-Process powershell.exe -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-Command',$semantic)
Start-Process powershell.exe -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-Command',$web)
Write-Host 'Started ChromaDB and Next.js in separate PowerShell windows.' -ForegroundColor Green
Write-Host 'First startup downloads the embedding model; wait for both windows to become ready.' -ForegroundColor Yellow
