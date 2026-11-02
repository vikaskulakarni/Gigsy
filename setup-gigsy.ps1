$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Semantic = Join-Path $Root 'semantic_service'

Write-Host '=== Gigsy local setup: MySQL + ChromaDB + Sentence Transformers ===' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required. Install Node.js 22 LTS, then rerun this script.' }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw 'Python launcher (py) is missing. Install Python 3.11, then rerun this script.' }

$PythonArgs = @('-3.13')
$PythonVersion = (& py @PythonArgs --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
  $PythonArgs = @('-3.11')
  $PythonVersion = (& py @PythonArgs --version 2>&1 | Out-String).Trim()
}
if ($LASTEXITCODE -ne 0) { throw 'Python 3.13 or 3.11 was not found. Install Python 3.13 (64-bit), then rerun this script.' }
Write-Host "Found $PythonVersion" -ForegroundColor Green

$SecurePassword = Read-Host 'Enter your CURRENT MySQL root password (input is hidden)' -AsSecureString
$Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
try { $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }

$SessionSecret = (& node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").Trim()
$ChromaToken = (& node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
$IndexingSecret = (& node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").Trim()

$envLocal = @"
# Generated locally by setup-gigsy.ps1. Do not commit this file.
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=$DbPassword
DB_NAME=gigsy
SESSION_SECRET=$SessionSecret
CHROMA_SERVICE_URL=http://127.0.0.1:8001
CHROMA_SERVICE_TOKEN=$ChromaToken
INDEXING_SECRET=$IndexingSecret
"@
Set-Content -Path (Join-Path $Root '.env.local') -Value $envLocal -Encoding utf8

$semanticEnv = @"
# Generated locally by setup-gigsy.ps1. Do not commit this file.
CHROMA_SERVICE_TOKEN=$ChromaToken
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHROMA_PATH=./chroma_data
CHROMA_COLLECTION=gigsy_gigs
"@
Set-Content -Path (Join-Path $Semantic '.env') -Value $semanticEnv -Encoding utf8

Write-Host 'Installing Python environment and dependencies...' -ForegroundColor Cyan
Push-Location $Semantic
try {
  & py @PythonArgs -m venv .venv
  if ($LASTEXITCODE -ne 0) { throw 'Could not create Python virtual environment.' }
  & .\.venv\Scripts\python.exe -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip.' }
  & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
} finally { Pop-Location }

Write-Host 'Installing Next.js dependencies...' -ForegroundColor Cyan
Push-Location $Root
try {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
} finally { Pop-Location }

Write-Host ''
Write-Host 'SETUP COMPLETE' -ForegroundColor Green
Write-Host 'Secrets were generated on this computer and written to .env.local and semantic_service\.env.'
Write-Host 'The Chroma token is identical in both files. No secrets were printed.'
Write-Host 'Next: run .\start-semantic.ps1 in Terminal 1 and .\start-gigsy.ps1 in Terminal 2.' -ForegroundColor Yellow
