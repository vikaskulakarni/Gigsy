$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Semantic=Join-Path $Root 'semantic_service'
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Install Node.js 22 LTS.'}
if(-not(Get-Command py -ErrorAction SilentlyContinue)){throw 'Install Python 3.11 or 3.13.'}
$PythonArgs=@('-3.13'); & py @PythonArgs --version *> $null
if($LASTEXITCODE -ne 0){$PythonArgs=@('-3.11');& py @PythonArgs --version *> $null}
if($LASTEXITCODE -ne 0){throw 'Python 3.13 or 3.11 is required.'}
$Secure=Read-Host 'Enter CURRENT MySQL root password (hidden)' -AsSecureString
$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
try{$DbPassword=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}
$SessionSecret=(& node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").Trim()
$Token=(& node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
$IndexSecret=(& node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").Trim()
@"
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=$DbPassword
DB_NAME=gigsy
SESSION_SECRET=$SessionSecret
CHROMA_SERVICE_URL=http://127.0.0.1:8001
CHROMA_SERVICE_TOKEN=$Token
INDEXING_SECRET=$IndexSecret
"@|Set-Content (Join-Path $Root '.env.local') -Encoding utf8
@"
CHROMA_SERVICE_TOKEN=$Token
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHROMA_PATH=./chroma_data
CHROMA_COLLECTION=gigsy_gigs
"@|Set-Content (Join-Path $Semantic '.env') -Encoding utf8
Push-Location $Semantic
try{& py @PythonArgs -m venv .venv;if($LASTEXITCODE -ne 0){throw 'venv creation failed.'}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
if($LASTEXITCODE -ne 0){throw 'Python dependency installation failed.'}}finally{Pop-Location}
Push-Location $Root
try{& npm.cmd ci;if($LASTEXITCODE -ne 0){throw 'npm ci failed.'}}finally{Pop-Location}
Write-Host 'Setup complete. Secrets are local; do not commit environment files.' -ForegroundColor Green
