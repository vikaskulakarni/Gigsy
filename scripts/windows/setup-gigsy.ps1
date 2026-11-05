$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Semantic = Join-Path $Root 'semantic_service'
$Schema = Join-Path $Root 'database\bootstrap\gigsy_schema.sql'
$EnvLocal = Join-Path $Root '.env.local'
$SemanticEnv = Join-Path $Semantic '.env'

Write-Host '=== Fresh Gigsy setup: Next.js + MySQL + FastAPI + ChromaDB ===' -ForegroundColor Cyan

if (Test-Path -LiteralPath $EnvLocal) {
  throw 'An existing .env.local was found. This script will not overwrite local credentials. Use RUN_GIGSY.ps1 to repair/install dependencies, or back up the file before intentionally creating a fresh setup.'
}
if (-not (Test-Path -LiteralPath $Schema)) {
  throw 'Missing database\bootstrap\gigsy_schema.sql. The repository maintainer must generate and commit the schema-only bootstrap file using export-bootstrap-schema.ps1 before teammates can run fresh setup.'
}
$schemaText = Get-Content -LiteralPath $Schema -Raw
if ($schemaText -match '(?im)^\s*(?:/\*!\d+\s*)?DROP\s+(?:TABLE|VIEW|PROCEDURE|FUNCTION|TRIGGER|EVENT)\b' -or $schemaText -match '(?i)DEFINER\s*=' -or $schemaText -match '(?im)^\s*USE\s+' -or $schemaText -match '(?im)^\s*INSERT\s+INTO\b') {
  throw 'Bootstrap SQL contains DROP, DEFINER, USE or INSERT statements. Refusing to import an unsafe or data-bearing schema file.'
}
if ([regex]::Matches($schemaText, '(?im)^CREATE TABLE `[^\r\n]+`').Count -ne 17) {
  throw 'Bootstrap SQL must contain exactly 17 CREATE TABLE statements.'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 LTS and ensure node.exe is on PATH.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm.cmd was not found. Reinstall Node.js 22 LTS and ensure npm is on PATH.' }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw 'Install Python 3.11 (64-bit) with the Windows py launcher.' }

$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -ne 22) { throw "Gigsy is configured for Node.js 22 LTS; detected $(node --version)." }

$pythonArgs = @('-3.11')
& py @pythonArgs --version *> $null
if ($LASTEXITCODE -ne 0) {
  $pythonArgs = @('-3.13')
  & py @pythonArgs --version *> $null
}
if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.11 or 3.13 (64-bit) with the py launcher.' }

$mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
if (-not $mysql) {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.0\bin\mysql.exe'),
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.4\bin\mysql.exe'),
    'C:\xampp\mysql\bin\mysql.exe'
  )
  $mysqlPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($mysqlPath) { $mysql = @{ Source = $mysqlPath } }
}
if (-not $mysql) { throw 'MySQL 8.x client mysql.exe was not found. Install MySQL Server and add its bin folder to PATH.' }

# Prefer a dedicated local development database so an existing gigsy database is untouched.
$dbName = 'gigsy_dev'
$appUser = 'gigsy_app'
$hostName = '127.0.0.1'
$port = '3306'
$adminUser = Read-Host 'MySQL administrator username [root]'
if ([string]::IsNullOrWhiteSpace($adminUser)) { $adminUser = 'root' }
$secure = Read-Host "Enter the MySQL password for $adminUser (input hidden)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

$appPassword = (& node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
$sessionSecret = (& node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").Trim()
$token = (& node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
$indexSecret = (& node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").Trim()

$env:MYSQL_PWD = $adminPassword
try {
  $escapedAppPassword = $appPassword.Replace("'", "''")
  $bootstrapSql = "CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER IF NOT EXISTS '$appUser'@'localhost' IDENTIFIED BY '$escapedAppPassword'; ALTER USER '$appUser'@'localhost' IDENTIFIED BY '$escapedAppPassword'; GRANT ALL PRIVILEGES ON $dbName.* TO '$appUser'@'localhost'; CREATE USER IF NOT EXISTS '$appUser'@'127.0.0.1' IDENTIFIED BY '$escapedAppPassword'; ALTER USER '$appUser'@'127.0.0.1' IDENTIFIED BY '$escapedAppPassword'; GRANT ALL PRIVILEGES ON $dbName.* TO '$appUser'@'127.0.0.1';"
  & $mysql.Source "--host=$hostName" "--port=$port" "--user=$adminUser" "--execute=$bootstrapSql"
  if ($LASTEXITCODE -ne 0) { throw 'Could not connect to MySQL or create the isolated gigsy_dev database/user. Check the MySQL service and administrator credentials.' }

  $countSql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$dbName' AND table_type='BASE TABLE';"
  $countOutput = & $mysql.Source "--host=$hostName" "--port=$port" "--user=$adminUser" "--batch" "--skip-column-names" "--execute=$countSql"
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the new development database.' }
  $tableCount = [int](($countOutput | Select-Object -Last 1).ToString().Trim())

  if ($tableCount -eq 0) {
    Write-Host 'Importing the repository schema into the new empty gigsy_dev database...' -ForegroundColor Cyan
    Get-Content -LiteralPath $Schema -Raw | & $mysql.Source "--host=$hostName" "--port=$port" "--user=$adminUser" "--database=$dbName"
    if ($LASTEXITCODE -ne 0) { throw 'Schema import failed. Inspect the MySQL error above; the existing gigsy database was not targeted.' }
  } elseif ($tableCount -lt 17) {
    throw "The isolated $dbName database already contains only $tableCount base tables. It was not modified; inspect it or choose a clean development database."
  } else {
    Write-Host "Found $tableCount existing base tables in $dbName; schema import skipped." -ForegroundColor Yellow
  }

  $verifySql = "SELECT CONCAT((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$dbName' AND table_type='BASE TABLE'),'|',(SELECT COUNT(*) FROM information_schema.views WHERE table_schema='$dbName'),'|',(SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$dbName'),'|',(SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$dbName' AND routine_type='PROCEDURE'));"
  $verify = & $mysql.Source "--host=$hostName" "--port=$port" "--user=$adminUser" "--batch" "--skip-column-names" "--execute=$verifySql"
  if ($LASTEXITCODE -ne 0) { throw 'Database verification query failed.' }
  $parts = (($verify | Select-Object -Last 1).ToString().Trim()).Split('|')
  if ($parts.Count -ne 4 -or [int]$parts[0] -lt 17 -or [int]$parts[1] -lt 3 -or [int]$parts[2] -lt 1 -or [int]$parts[3] -lt 1) {
    throw "Database verification failed. Expected at least 17 tables, 3 views, 1 trigger and 1 procedure. Actual: $($parts -join '|')."
  }

  $env:MYSQL_PWD = $appPassword
  & $mysql.Source "--host=$hostName" "--port=$port" "--user=$appUser" "--database=$dbName" "--execute=SELECT 1"
  if ($LASTEXITCODE -ne 0) { throw 'The generated Gigsy application database credentials could not connect.' }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

$rootEnv = @"
# Generated locally by scripts/windows/setup-gigsy.ps1. Do not commit.
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=$appUser
DB_PASSWORD=$appPassword
DB_NAME=$dbName
SESSION_SECRET=$sessionSecret
CHROMA_SERVICE_URL=http://127.0.0.1:8001
CHROMA_SERVICE_TOKEN=$token
INDEXING_SECRET=$indexSecret
"@
$semanticEnv = @"
# Generated locally by scripts/windows/setup-gigsy.ps1. Do not commit.
CHROMA_SERVICE_TOKEN=$token
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHROMA_PATH=./chroma_data
CHROMA_COLLECTION=gigsy_gigs
"@
[System.IO.File]::WriteAllText($EnvLocal, $rootEnv, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($SemanticEnv, $semanticEnv, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Installing Python semantic-service dependencies...' -ForegroundColor Cyan
Push-Location $Semantic
try {
  & py @pythonArgs -m venv .venv
  if ($LASTEXITCODE -ne 0) { throw 'Could not create semantic_service\.venv.' }
  & .\.venv\Scripts\python.exe -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip.' }
  & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
} finally { Pop-Location }

Write-Host 'Installing locked Node.js dependencies with npm ci...' -ForegroundColor Cyan
Push-Location $Root
try {
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
} finally { Pop-Location }

Write-Host ''
Write-Host 'GIGSY SETUP COMPLETE' -ForegroundColor Green
Write-Host "Database: $dbName | MySQL objects verified: $($parts -join ' | ')" -ForegroundColor Green
Write-Host 'Local secrets were generated and are not printed.' -ForegroundColor Green
Write-Host 'Next run: .\scripts\windows\RUN_GIGSY.ps1' -ForegroundColor Cyan
