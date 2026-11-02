# Gigsy one-time Windows setup

1. Open PowerShell in this project folder.
2. Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
3. Run: `./setup-gigsy.ps1`
4. Enter the current MySQL root password when prompted. Input is hidden. The script writes `.env.local` and `semantic_service/.env`, generating three fresh secrets locally and using the same Chroma token in both files.
5. Start the semantic service in Terminal 1: `./start-semantic.ps1`
6. Start Next.js in Terminal 2: `./start-gigsy.ps1`
7. Check `http://localhost:8001/health` and `http://localhost:3000/api/health`.
8. In Terminal 2, index gigs:

```powershell
$secret = Read-Host 'Enter INDEXING_SECRET' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $indexSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/index-gigs -Headers @{'x-indexing-secret'=$indexSecret}
Remove-Variable indexSecret,secret
```

The first semantic-service startup downloads the `sentence-transformers/all-MiniLM-L6-v2` model. Internet is needed for this first download; embeddings and search run locally afterwards.

The setup script does not change MySQL users/passwords or database contents. If the current MySQL password was exposed, rotate it separately in MySQL Workbench and enter the new password when running setup.
