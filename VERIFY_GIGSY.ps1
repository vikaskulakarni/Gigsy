# Gigsy one-command verification script
# Run from the repository root in PowerShell:
# Set-ExecutionPolicy -Scope Process Bypass -Force; .\VERIFY_GIGSY.ps1
$ErrorActionPreference = "Stop"
$Root = (Get-Location).Path
$Required = @("package.json", "package-lock.json", "src", "semantic_service", "database")
foreach ($item in $Required) {
    if (-not (Test-Path (Join-Path $Root $item))) {
        throw "Run this script from the Gigsy repository root. Missing: $item"
    }
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutDir = Join-Path $Root "artifacts\verification\$Stamp"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Log = Join-Path $OutDir "verification.log"
$Summary = Join-Path $OutDir "verification-summary.md"
Start-Transcript -Path $Log -Force | Out-Null

$Results = [System.Collections.Generic.List[object]]::new()
function Add-Result([string]$Name, [string]$Status, [string]$Details) {
    $Results.Add([pscustomobject]@{ Check=$Name; Status=$Status; Details=$Details })
    Write-Host "[$Status] $Name — $Details" -ForegroundColor $(if($Status -eq "PASS"){"Green"}elseif($Status -eq "WARN"){"Yellow"}else{"Red"})
}
function Invoke-Check([string]$Name, [scriptblock]$Action) {
    try {
        & $Action
        if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { throw "Exit code $LASTEXITCODE" }
        Add-Result $Name "PASS" "Completed successfully"
        return $true
    } catch {
        Add-Result $Name "FAIL" $_.Exception.Message
        return $false
    }
}
try {
    Write-Host "`n=== GIGSY AUTOMATED VERIFICATION ===" -ForegroundColor Cyan
    Write-Host "Repository: $Root"
    Write-Host "Output: $OutDir"

    # Git safety: do not overwrite local changes.
    $status = git status --porcelain
    if ($LASTEXITCODE -ne 0) { throw "Git status failed." }
    if ($status) {
        Add-Result "Git working tree" "WARN" "Uncommitted changes detected; skipped pull to protect local work."
    } else {
        git fetch origin
        if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
        git switch main
        if ($LASTEXITCODE -ne 0) { throw "Could not switch to main." }
        git pull --ff-only origin main
        if ($LASTEXITCODE -ne 0) { throw "Could not fast-forward main." }
        Add-Result "Git main update" "PASS" "Fetched and fast-forwarded origin/main."
    }

    $node = node --version
    if ($LASTEXITCODE -eq 0) { Add-Result "Node.js" "PASS" $node } else { Add-Result "Node.js" "FAIL" "Node.js not found"; throw "Node.js is required." }
    $npm = npm.cmd --version
    if ($LASTEXITCODE -eq 0) { Add-Result "npm" "PASS" $npm } else { throw "npm.cmd not found." }

    if (-not (Invoke-Check "Dependency installation (npm ci)" { npm.cmd ci })) {
        throw "Dependency installation failed; see verification.log."
    }
    if (-not (Invoke-Check "TypeScript validation" { npx.cmd tsc --noEmit })) {
        throw "TypeScript validation failed; see verification.log."
    }
    if (-not (Invoke-Check "Next.js production build" { npm.cmd run build })) {
        throw "Production build failed; see verification.log."
    }

    # Health endpoints are checked only if the services are already running.
    foreach ($endpoint in @(
        @{Name="Next.js/MySQL health"; Url="http://localhost:3000/api/health"},
        @{Name="FastAPI/ChromaDB health"; Url="http://127.0.0.1:8001/health"}
    )) {
        try {
            $response = Invoke-RestMethod -Uri $endpoint.Url -TimeoutSec 5
            $json = $response | ConvertTo-Json -Depth 8
            $safeName = ($endpoint.Name -replace '[^A-Za-z0-9]+','-').Trim('-')
            $json | Set-Content (Join-Path $OutDir "$safeName.json") -Encoding utf8
            Add-Result $endpoint.Name "PASS" "Endpoint responded; response saved to $safeName.json"
        } catch {
            Add-Result $endpoint.Name "WARN" "Not reachable. Start the corresponding service to perform runtime health verification."
        }
    }

    # Read-only MySQL metadata inspection; no schema/data modifications.
    $mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
    $envFile = Join-Path $Root ".env.local"
    if ($mysql -and (Test-Path $envFile)) {
        $cfg = @{}
        Get-Content $envFile | ForEach-Object {
            $line = $_ -replace '^\uFEFF',''
            if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$' -and -not $Matches[1].StartsWith("#")) {
                $cfg[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
            }
        }
        $dbHost = if($cfg.DB_HOST){$cfg.DB_HOST}else{"localhost"}
        $dbPort = if($cfg.DB_PORT){$cfg.DB_PORT}else{"3306"}
        $dbUser = if($cfg.DB_USER){$cfg.DB_USER}else{"root"}
        $dbName = if($cfg.DB_NAME){$cfg.DB_NAME}else{"gigsy"}
        if ($cfg.DB_PASSWORD) { $env:MYSQL_PWD = $cfg.DB_PASSWORD }
        try {
            $sql = @"
SELECT VERSION() AS mysql_version;
SHOW FULL TABLES;
SHOW TRIGGERS;
SELECT ROUTINE_NAME, ROUTINE_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE();
"@
            $dbOutput = $sql | & $mysql.Source --host=$dbHost --port=$dbPort --user=$dbUser --database=$dbName --batch --raw 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dbOutput | Set-Content (Join-Path $OutDir "mysql-readonly-metadata.txt") -Encoding utf8
                Add-Result "MySQL read-only metadata" "PASS" "Version, tables/views, triggers and routines saved."
            } else {
                Add-Result "MySQL read-only metadata" "WARN" "MySQL command failed: $($dbOutput -join ' ')"
            }
        } finally {
            Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
        }
    } else {
        Add-Result "MySQL read-only metadata" "WARN" "mysql.exe or .env.local unavailable; no database command executed."
    }

    # Save current Git identity without exposing environment secrets.
    $branch = git branch --show-current
    $commit = git rev-parse HEAD
    Add-Result "Git revision" "PASS" "Branch=$branch; Commit=$commit"

    $lines = @(
        "# Gigsy automated verification",
        "",
        "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "Branch: $branch",
        "Commit: $commit",
        "",
        "| Check | Status | Details |",
        "|---|---|---|"
    )
    foreach ($r in $Results) {
        $detail = ($r.Details -replace '\|','/') -replace '\r?\n',' '
        $lines += "| $($r.Check) | $($r.Status) | $detail |"
    }
    $lines += @(
        "",
        "## Scope and limitations",
        "- This script performs dependency installation, TypeScript validation, production build and optional health/metadata checks.",
        "- MySQL commands are read-only metadata queries. No INSERT, UPDATE, DELETE, DROP, ALTER or migration is run.",
        "- Browser workflows, proposal acceptance, semantic relevance, and screenshot evidence require genuine test-account interaction and are not fabricated by this script.",
        "- Review the full console transcript in verification.log."
    )
    $lines | Set-Content $Summary -Encoding utf8
    Write-Host "`nSummary saved: $Summary" -ForegroundColor Green
    Write-Host "Full log saved: $Log" -ForegroundColor Green
    Write-Host "Verification artifacts: $OutDir" -ForegroundColor Green
}
finally {
    Stop-Transcript | Out-Null
}
