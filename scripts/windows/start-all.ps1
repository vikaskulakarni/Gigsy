$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if(-not(Test-Path (Join-Path $Root '.env.local'))){throw 'Run scripts\windows\setup-gigsy.ps1 first.'}
$semantic="Set-Location '$Root'; & '$PSScriptRoot\start-semantic.ps1'"
$web="Start-Sleep -Seconds 8; Set-Location '$Root'; & '$PSScriptRoot\start-gigsy.ps1'"
Start-Process powershell.exe -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-Command',$semantic)
Start-Process powershell.exe -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-Command',$web)
Write-Host 'Started semantic service and Next.js in separate PowerShell windows.' -ForegroundColor Green
