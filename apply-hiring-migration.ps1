$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root '.env.local'
$Migration = Join-Path $Root 'database\gigsy_hiring_workflow.sql'

if (-not (Test-Path $EnvFile)) { throw 'Missing .env.local. Run Gigsy from your existing configured folder.' }
if (-not (Test-Path $Migration)) { throw 'Missing database\gigsy_hiring_workflow.sql.' }
$mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
if (-not $mysql) {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.0\bin\mysql.exe'),
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.4\bin\mysql.exe'),
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 9.0\bin\mysql.exe'),
    'C:\xampp\mysql\bin\mysql.exe'
  )
  $mysqlPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($mysqlPath) { $mysql = @{ Source = $mysqlPath } }
}
if (-not $mysql) {
  Write-Host 'mysql.exe was not found in PATH or standard MySQL install folders.' -ForegroundColor Yellow
  Write-Host 'Open MySQL Workbench, select the gigsy database, open database\gigsy_hiring_workflow.sql, and execute the complete script.' -ForegroundColor Yellow
  throw 'Run the migration in MySQL Workbench, then continue with npm.cmd run build.'
}

$settings = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_ -replace '^\uFEFF',''
  if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$' -and -not $Matches[1].StartsWith('#')) {
    $settings[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$hostName = if ($settings.DB_HOST) { $settings.DB_HOST } else { 'localhost' }
$port = if ($settings.DB_PORT) { $settings.DB_PORT } else { '3306' }
$user = if ($settings.DB_USER) { $settings.DB_USER } else { 'root' }
$db = if ($settings.DB_NAME) { $settings.DB_NAME } else { 'gigsy' }
if ($settings.DB_PASSWORD) { $env:MYSQL_PWD = $settings.DB_PASSWORD }

Write-Host "Applying additive Gigsy hiring migration to $db on $hostName`:$port ..." -ForegroundColor Cyan
try {
  Get-Content -Raw $Migration | & $mysql.Source --host=$hostName --port=$port --user=$user --database=$db
  if ($LASTEXITCODE -ne 0) { throw 'MySQL returned an error. No application files were changed; inspect the MySQL error above.' }
  Write-Host 'Hiring workflow migration applied successfully.' -ForegroundColor Green
  Write-Host 'New tables: gigsy_contracts, gigsy_milestones, gigsy_notifications' -ForegroundColor Green
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
