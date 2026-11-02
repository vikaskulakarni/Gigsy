$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root
$setup=Join-Path $PSScriptRoot 'setup-gigsy.ps1'
$migration=Join-Path $PSScriptRoot 'apply-hiring-migration.ps1'
$starter=Join-Path $PSScriptRoot 'start-all.ps1'
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Install Node.js 22 LTS.'}
if(-not (Get-Command py -ErrorAction SilentlyContinue)){throw 'Install Python 3.11 or 3.13 with py launcher.'}
$services=Get-Service -ErrorAction SilentlyContinue|Where-Object {$_.Name -match '^(MySQL|MySQL80|MariaDB)' -or $_.DisplayName -match 'MySQL|MariaDB'}
foreach($svc in $services){if($svc.Status -ne 'Running'){Start-Service $svc.Name}}
if(-not(Test-Path '.env.local') -or -not(Test-Path 'node_modules') -or -not(Test-Path 'semantic_service\.venv\Scripts\python.exe')){& $setup}
if(-not(Test-Path '.env.local')){throw 'Missing .env.local after setup.'}
if(Get-Command mysql.exe -ErrorAction SilentlyContinue){& $migration}
& $starter
Write-Host 'Gigsy: http://localhost:3000 | Semantic health: http://localhost:8001/health' -ForegroundColor Green
