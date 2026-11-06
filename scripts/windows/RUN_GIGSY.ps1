$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $Root

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '       GIGSY CLEAN-CLONE LAUNCHER' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 LTS and ensure node.exe is on PATH.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm.cmd was not found. Reinstall Node.js 22 LTS.' }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw 'Install Python 3.11 or 3.13 (64-bit) with the py launcher.' }

$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -ne 22) { throw "Gigsy requires Node.js 22 LTS; detected $(node --version)." }
Write-Host "Node $(node --version) | npm $(& npm.cmd --version)" -ForegroundColor Green

# Start a detected local MySQL Windows service if it is stopped.
$mysqlServices = Get-Service -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -match '^(MySQL|MySQL80|MySQL84|MariaDB)' -or $_.DisplayName -match 'MySQL|MariaDB'
}
if ($mysqlServices) {
  $running = $mysqlServices | Where-Object Status -eq 'Running' | Select-Object -First 1
  if (-not $running) {
    $service = $mysqlServices | Select-Object -First 1
    Write-Host "Starting MySQL service $($service.Name)..." -ForegroundColor Yellow
    Start-Service -Name $service.Name
    Start-Sleep -Seconds 5
  }
} else {
  Write-Host 'No MySQL Windows service was detected. MySQL must already be running.' -ForegroundColor Yellow
}

$setup = Join-Path $PSScriptRoot 'setup-gigsy.ps1'
$starter = Join-Path $PSScriptRoot 'start-all.ps1'
$envLocal = Join-Path $Root '.env.local'
$semanticEnv = Join-Path $Root 'semantic_service\.env'

if (-not (Test-Path -LiteralPath $envLocal)) {
  Write-Host 'First run detected. Creating the local database and installing dependencies...' -ForegroundColor Cyan
  & $setup
  if ($LASTEXITCODE -ne 0) { throw 'First-time setup failed. Read the error above and rerun this launcher after correcting it.' }
} else {
  Write-Host 'Existing local configuration found; secrets will not be overwritten.' -ForegroundColor Green

  if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
    Write-Host 'Installing Node dependencies with npm ci...' -ForegroundColor Cyan
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
  }

  $pythonExe = Join-Path $Root 'semantic_service\.venv\Scripts\python.exe'
  if (-not (Test-Path $pythonExe)) {
    $installedPython = & py -0p
    if ($LASTEXITCODE -ne 0) {
      throw 'Could not query installed Python runtimes using py -0p.'
    }

    $pythonList = $installedPython -join "`n"

    if ($pythonList -match '(?m)-V:3\.11(?:\s|$)') {
      $pythonArgs = @('-3.11')
    }
    elseif ($pythonList -match '(?m)-V:3\.13(?:\s|$)') {
      $pythonArgs = @('-3.13')
    }
    else {
      throw 'Python 3.11 or 3.13 is required.'
    }

    Write-Host "Using Python $(& py @pythonArgs --version)" -ForegroundColor Green

    Push-Location (Join-Path $Root 'semantic_service')
    try {
      & py @pythonArgs -m venv .venv
      if ($LASTEXITCODE -ne 0) { throw 'Could not create Python virtual environment.' }
      & .\.venv\Scripts\python.exe -m pip install --upgrade pip
      if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip.' }
      & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
      if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
    } finally { Pop-Location }
  }

  # Repair a missing semantic .env from the matching token in .env.local.
  $rootTokenLine = Get-Content -LiteralPath $envLocal | Where-Object { $_ -match '^\s*CHROMA_SERVICE_TOKEN\s*=' } | Select-Object -First 1
  if (-not $rootTokenLine) { throw 'CHROMA_SERVICE_TOKEN is missing from .env.local.' }
  $rootToken = ($rootTokenLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
  if (-not $rootToken) { throw 'CHROMA_SERVICE_TOKEN is empty in .env.local.' }

  if (-not (Test-Path -LiteralPath $semanticEnv)) {
    $semanticLines = @(
      "CHROMA_SERVICE_TOKEN=$rootToken",
      'EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2',
      'CHROMA_PATH=./chroma_data',
      'CHROMA_COLLECTION=gigsy_gigs'
    )
  } else {
    $semanticLines = @(Get-Content -LiteralPath $semanticEnv)
    $tokenIndex = -1
    for ($i = 0; $i -lt $semanticLines.Count; $i++) {
      if ($semanticLines[$i] -match '^\s*CHROMA_SERVICE_TOKEN\s*=') { $tokenIndex = $i; break }
    }
    if ($tokenIndex -ge 0) {
      $semanticLines[$tokenIndex] = "CHROMA_SERVICE_TOKEN=$rootToken"
    } else {
      $semanticLines = @("CHROMA_SERVICE_TOKEN=$rootToken") + $semanticLines
    }
  }
  [System.IO.File]::WriteAllLines($semanticEnv, [string[]]$semanticLines, [System.Text.UTF8Encoding]::new($false))
}

if (-not (Test-Path -LiteralPath $envLocal)) { throw 'Missing .env.local after setup.' }
if (-not (Test-Path -LiteralPath $semanticEnv)) { throw 'Missing semantic_service\.env after setup.' }
if (-not (Test-Path (Join-Path $Root 'node_modules'))) { throw 'Node dependencies are missing.' }
if (-not (Test-Path (Join-Path $Root 'semantic_service\.venv\Scripts\python.exe'))) { throw 'Python virtual environment is missing.' }

Write-Host 'Launching FastAPI/ChromaDB and Next.js in separate PowerShell windows...' -ForegroundColor Cyan
& $starter
if ($LASTEXITCODE -ne 0) { throw 'Could not launch Gigsy services.' }

# Wait for both HTTP services. The Next.js health endpoint also verifies MySQL.
$semanticReady = $false
$webReady = $false
for ($i = 0; $i -lt 36; $i++) {
  Start-Sleep -Seconds 5
  if (-not $semanticReady) {
    try {
      $semanticHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/health' -TimeoutSec 3
      if ($semanticHealth.ok -eq $true) { $semanticReady = $true }
    } catch { }
  }
  if (-not $webReady) {
    try {
      $webHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 3
      if ($webHealth.ok -eq $true) { $webReady = $true }
    } catch { }
  }
  if ($semanticReady -and $webReady) { break }
}

Write-Host ''
if ($semanticReady) {
  Write-Host 'FastAPI + ChromaDB health: OK' -ForegroundColor Green
} else {
  Write-Host 'FastAPI health check did not pass. Inspect the semantic-service window.' -ForegroundColor Red
}
if ($webReady) {
  Write-Host 'Next.js + MySQL health: OK' -ForegroundColor Green
} else {
  Write-Host 'Next.js/MySQL health check did not pass. Inspect the Next.js window and .env.local.' -ForegroundColor Red
}

if ($semanticReady -and $webReady) {
  Write-Host 'Opening http://localhost:3000' -ForegroundColor Green
  Start-Process 'http://localhost:3000'
} else {
  throw 'Gigsy did not pass all startup health checks. The two service windows remain open for diagnosis.'
}

Write-Host 'Keep both service windows open while using Gigsy.' -ForegroundColor Yellow
