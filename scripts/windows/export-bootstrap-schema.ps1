$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $Root '.env.local'
$OutputFile = Join-Path $Root 'database\bootstrap\gigsy_schema.sql'

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw 'Missing .env.local. Run scripts\windows\setup-gigsy.ps1 in the existing working copy first.'
}

# Find mysqldump beside mysql.exe when it is not already on PATH.
$dump = Get-Command mysqldump.exe -ErrorAction SilentlyContinue
if (-not $dump) {
  $mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
  if ($mysql) {
    $candidate = Join-Path (Split-Path -Parent $mysql.Source) 'mysqldump.exe'
    if (Test-Path -LiteralPath $candidate) { $dump = @{ Source = $candidate } }
  }
}
if (-not $dump) {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.0\bin\mysqldump.exe'),
    (Join-Path $env:ProgramFiles 'MySQL\MySQL Server 8.4\bin\mysqldump.exe'),
    'C:\xampp\mysql\bin\mysqldump.exe'
  )
  $candidate = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($candidate) { $dump = @{ Source = $candidate } }
}
if (-not $dump) { throw 'mysqldump.exe was not found. Install MySQL Server tools or add its bin folder to PATH.' }

# Read only the database connection settings needed for a schema-only export.
$settings = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_ -replace '^\uFEFF', ''
  if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$' -and -not $Matches[1].StartsWith('#')) {
    $settings[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$hostName = if ($settings.DB_HOST) { $settings.DB_HOST } else { 'localhost' }
$port = if ($settings.DB_PORT) { $settings.DB_PORT } else { '3306' }
$user = if ($settings.DB_USER) { $settings.DB_USER } else { 'root' }
$db = if ($settings.DB_NAME) { $settings.DB_NAME } else { 'gigsy' }
if ($db -notmatch '^[A-Za-z0-9_]+$') { throw 'DB_NAME contains unsupported characters.' }
if (-not $settings.DB_PASSWORD) { throw 'DB_PASSWORD is empty in .env.local.' }

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputFile) | Out-Null
$stderrFile = Join-Path $env:TEMP 'gigsy-mysqldump-stderr.txt'
$env:MYSQL_PWD = $settings.DB_PASSWORD

try {
  $dumpArgs = @(
    "--host=$hostName",
    "--port=$port",
    "--user=$user",
    '--no-data',
    '--routines',
    '--triggers',
    '--events',
    '--skip-add-drop-table',
    '--skip-add-locks',
    '--skip-disable-keys',
    '--no-tablespaces',
    '--column-statistics=0',
    '--set-gtid-purged=OFF',
    $db
  )
  $rawLines = & $dump.Source @dumpArgs 2> $stderrFile
  $dumpExit = $LASTEXITCODE
  if ($dumpExit -ne 0) {
    $details = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw } else { 'No diagnostic output.' }
    throw "mysqldump failed with exit code $dumpExit. $details"
  }
  $sql = ($rawLines -join [Environment]::NewLine)

  # mysqldump emits temporary placeholder views followed by final view definitions.
  # Remove the temporary blocks so each real view is created exactly once.
  $sql = [regex]::Replace(
    $sql,
    '(?ms)^--\s*Temporary view structure for view `[^\r\n]+`\s*\r?\n.*?^SET character_set_client = @saved_cs_client;\s*\r?\n?',
    ''
  )

  # Remove machine-specific DEFINER accounts and all DROP statements. The resulting
  # file is for initializing a brand-new empty development database, never a live DB.
  $sql = [regex]::Replace($sql, '(?i)DEFINER\s*=\s*`[^`]+`@`[^`]+`\s*', '')
  $sql = [regex]::Replace(
    $sql,
    '(?im)^\s*(?:/\*!\d+\s*)?DROP\s+(?:TABLE|VIEW|PROCEDURE|FUNCTION|TRIGGER|EVENT)\s+IF\s+EXISTS\s+`[^`]+`(?:\s*\*/)?\s*;\s*\r?\n?',
    ''
  )
  $sql = [regex]::Replace($sql, '\sAUTO_INCREMENT=\d+', '')

  $tableCount = [regex]::Matches($sql, '(?im)^CREATE TABLE `[^\r\n]+`').Count
  $viewCount = [regex]::Matches($sql, '(?im)^/\*!50001 VIEW `[^\r\n]+`').Count
  $hasTrigger = $sql -match '(?i)\bTRIGGER\b'
  $hasProcedure = $sql -match '(?i)\bPROCEDURE\b'

  if ($tableCount -ne 17) {
    throw "Expected 17 base tables in the export, found $tableCount. The output was not saved."
  }
  if ($viewCount -ne 3 -or -not $hasTrigger -or -not $hasProcedure) {
    throw "Expected 3 views, 1 trigger and 1 stored procedure. Found views=$viewCount, trigger=$hasTrigger, procedure=$hasProcedure. The output was not saved."
  }
  if ($sql -notmatch '(?is)CREATE TABLE `review`.*?`contract_id`\s+int\s+DEFAULT NULL.*?`gigsy_contract_id`\s+bigint\s+DEFAULT NULL') {
    throw 'The current review table does not contain the expected nullable legacy contract_id and BIGINT gigsy_contract_id. Update the live database before exporting.'
  }
  if ($sql -notmatch '(?is)CREATE TABLE `gigsy_contracts`.*?`contract_id`\s+bigint' -or $sql -notmatch '(?is)CREATE TABLE `contract`.*?`contract_id`\s+int') {
    throw 'The legacy INT contract and newer BIGINT Gigsy contract identifier types were not both found.'
  }
  if ($sql -match '(?im)^\s*INSERT\s+INTO\b') {
    throw 'The export unexpectedly contains INSERT statements. Refusing to write a file containing data.'
  }
  if ($sql -match '(?im)^\s*DROP\s+(?:TABLE|VIEW|PROCEDURE|FUNCTION|TRIGGER|EVENT)\b' -or $sql -match '(?i)DEFINER\s*=') {
    throw 'Unsafe DROP or DEFINER statement remains after sanitization. The output was not saved.'
  }

  $header = @'
-- Gigsy development bootstrap schema
-- Generated from the maintainer's current MySQL schema using mysqldump --no-data.
-- Contains DDL only: no user, gig, proposal, message, or other application rows.
-- Import ONLY into a new, empty development database. Never import into a populated database.

'@
  [System.IO.File]::WriteAllText(
    $OutputFile,
    $header + $sql + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-Host 'Schema-only bootstrap export created:' -ForegroundColor Green
  Write-Host $OutputFile -ForegroundColor Cyan
  Write-Host "Tables: $tableCount | Views: $viewCount | Trigger: present | Procedure: present" -ForegroundColor Green
  Write-Host 'No INSERT statements, DROP statements or machine-specific DEFINER clauses were included.' -ForegroundColor Green
  Write-Host 'Review the generated file before committing it to GitHub.' -ForegroundColor Yellow
}
finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  Remove-Item $stderrFile -ErrorAction SilentlyContinue
}
