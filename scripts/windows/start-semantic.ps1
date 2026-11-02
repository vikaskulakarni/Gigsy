$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location (Join-Path $Root 'semantic_service')
if(-not(Test-Path '.\.venv\Scripts\python.exe')){throw 'Run scripts\windows\setup-gigsy.ps1 first.'}
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
