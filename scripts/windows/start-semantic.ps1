$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Semantic = Join-Path $Root 'semantic_service'
$EnvFile = Join-Path $Semantic '.env'
$Python = Join-Path $Semantic '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Missing semantic_service\.env. Run scripts\windows\setup-gigsy.ps1 first."
}
if (-not (Test-Path -LiteralPath $Python)) {
  throw "Python environment is missing. Run scripts\windows\setup-gigsy.ps1 first."
}

# Load only the documented semantic-service variables into this process.
# Python does not automatically read .env files, so this is required for
# CHROMA_SERVICE_TOKEN authentication and persistent Chroma configuration.
$allowed = @('CHROMA_SERVICE_TOKEN', 'EMBEDDING_MODEL', 'CHROMA_PATH', 'CHROMA_COLLECTION')
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) { return }
  $name = $parts[0].Trim()
  if ($allowed -notcontains $name) { return }
  $value = $parts[1].Trim().Trim('"').Trim("'")
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

if ([string]::IsNullOrWhiteSpace($env:CHROMA_SERVICE_TOKEN)) {
  throw "CHROMA_SERVICE_TOKEN is empty in semantic_service\.env."
}

Set-Location $Semantic
Write-Host 'Starting Gigsy FastAPI + ChromaDB semantic service on http://127.0.0.1:8001' -ForegroundColor Cyan
& $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
if ($LASTEXITCODE -ne 0) {
  throw "Semantic service exited with code $LASTEXITCODE."
}
