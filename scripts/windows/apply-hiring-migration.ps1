$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile=Join-Path $Root '.env.local'
$Migration=Join-Path $Root 'database\migrations\gigsy_hiring_workflow.sql'
if(-not(Test-Path $EnvFile)){throw 'Missing .env.local.'}
if(-not(Test-Path $Migration)){throw 'Missing hiring migration.'}
$mysql=Get-Command mysql.exe -ErrorAction SilentlyContinue
if(-not $mysql){throw 'mysql.exe not found. Review and run database\migrations\gigsy_hiring_workflow.sql in MySQL Workbench.'}
$settings=@{}
Get-Content $EnvFile|ForEach-Object{$line=$_ -replace '^\uFEFF','';if($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$' -and -not $Matches[1].StartsWith('#')){$settings[$Matches[1]]=$Matches[2].Trim().Trim('"').Trim("'")}}
$hostName=if($settings.DB_HOST){$settings.DB_HOST}else{'localhost'}
$port=if($settings.DB_PORT){$settings.DB_PORT}else{'3306'}
$user=if($settings.DB_USER){$settings.DB_USER}else{'root'}
$db=if($settings.DB_NAME){$settings.DB_NAME}else{'gigsy'}
if($settings.DB_PASSWORD){$env:MYSQL_PWD=$settings.DB_PASSWORD}
try{Get-Content -Raw $Migration|& $mysql.Source --host=$hostName --port=$port --user=$user --database=$db;if($LASTEXITCODE -ne 0){throw 'Migration failed; inspect MySQL output.'}}finally{Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}
Write-Host 'Hiring migration completed.' -ForegroundColor Green
