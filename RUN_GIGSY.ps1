$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '              GIGSY LAUNCHER' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

# Check the required local runtimes.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is missing. Install Node.js 22 LTS from https://nodejs.org/ and rerun this script.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm is missing. Reinstall Node.js 22 LTS and ensure Add to PATH is selected.' }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw 'Python launcher is missing. Install Python 3.11 or 3.13 (64-bit) from https://www.python.org/downloads/ and rerun.' }

Write-Host "Node: $(node --version) | npm: $(& npm.cmd --version)" -ForegroundColor Green

# Start a locally installed MySQL Windows service if one is present but stopped.
$mysqlServices = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(MySQL|MySQL80|MariaDB)' -or $_.DisplayName -match 'MySQL|MariaDB' }
if ($mysqlServices) {
  foreach ($svc in $mysqlServices) {
    if ($svc.Status -ne 'Running') {
      Write-Host "Starting database service $($svc.Name)..." -ForegroundColor Yellow
      Start-Service -Name $svc.Name
    }
  }
  Start-Sleep -Seconds 3
} else {
  Write-Host 'No MySQL Windows service was detected. Ensure MySQL Server is installed and running before continuing.' -ForegroundColor Yellow
}

# Run first-time setup, or repair incomplete dependency installation.
$needsSetup = -not (Test-Path (Join-Path $Root '.env.local')) -or
              -not (Test-Path (Join-Path $Root 'node_modules')) -or
              -not (Test-Path (Join-Path $Root 'semantic_service\.venv\Scripts\python.exe'))
if ($needsSetup) {
  Write-Host 'Running setup: this installs npm/Python packages and configures local secrets.' -ForegroundColor Cyan
  & (Join-Path $Root 'setup-gigsy.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Gigsy setup did not complete. Read the error above, fix it, and rerun .\RUN_GIGSY.ps1.' }
} else {
  Write-Host 'Existing local configuration and dependencies found; skipping reinstall.' -ForegroundColor Green
}

if (-not (Test-Path (Join-Path $Root '.env.local'))) { throw 'Missing .env.local. Setup did not create it.' }
if (-not (Test-Path (Join-Path $Root 'node_modules'))) { throw 'Missing node_modules. npm dependencies are not installed.' }

# Apply the additive, idempotent hiring workflow migration when mysql.exe is available.
if (Get-Command mysql.exe -ErrorAction SilentlyContinue) {
  & (Join-Path $Root 'apply-hiring-migration.ps1')
} else {
  Write-Host 'Hiring workflow migration not auto-applied: mysql.exe is not in PATH.' -ForegroundColor Yellow
  Write-Host 'Run .\\apply-hiring-migration.ps1 or execute database\\gigsy_hiring_workflow.sql in MySQL Workbench before accepting proposals.' -ForegroundColor Yellow
}

Write-Host 'Launching ChromaDB and Next.js in separate PowerShell windows...' -ForegroundColor Cyan
& (Join-Path $Root 'start-all.ps1')

Write-Host 'Waiting for Next.js API health check (up to 120 seconds)...' -ForegroundColor Yellow
$webReady = $false
for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep -Seconds 5
  try {
    $health = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 4
    if ($health.ok -eq $true) { $webReady = $true; break }
  } catch { }
}
if ($webReady) {
  Write-Host 'MySQL connection through Gigsy API: OK' -ForegroundColor Green
  Write-Host 'Opening http://localhost:3000' -ForegroundColor Green
  Start-Process 'http://localhost:3000'
} else {
  Write-Host 'Next.js has been launched, but the MySQL API health check did not pass.' -ForegroundColor Red
  Write-Host 'Check that MySQL Server is running, the gigsy database exists, and DB_PASSWORD in .env.local is correct.' -ForegroundColor Yellow
  Write-Host 'API health URL: http://localhost:3000/api/health' -ForegroundColor Yellow
}

Write-Host 'Chroma health URL: http://localhost:8001/health' -ForegroundColor Cyan
Write-Host 'Gigsy URL: http://localhost:3000' -ForegroundColor Cyan
Write-Host 'Keep both service windows open while using Gigsy.' -ForegroundColor Yellow
