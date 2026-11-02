# Local semantic search setup

Gigsy's semantic matching service uses FastAPI, Sentence Transformers and ChromaDB. The configured model is `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional embeddings).

MySQL remains the source of truth for gig information. ChromaDB stores vector representations used for similarity retrieval.

## 1. Configure the Next.js application

In the repository root, copy `.env.example` to `.env.local`. Keep your existing MySQL and session settings. Configure:

```env
CHROMA_SERVICE_URL=http://127.0.0.1:8001
CHROMA_SERVICE_TOKEN=your-long-random-secret
INDEXING_SECRET=your-separate-long-random-secret
```

Generate secrets locally, for example:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Install the Python service (PowerShell terminal 1)

From the repository root:

```powershell
cd semantic_service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `semantic_service/.env` and set `CHROMA_SERVICE_TOKEN` to exactly the same value used by Next.js. Keep this file private.

## 3. Start FastAPI

With the virtual environment activated and current directory set to `semantic_service`:

```powershell
$env:CHROMA_SERVICE_TOKEN = (Get-Content .env | Where-Object { $_ -match '^CHROMA_SERVICE_TOKEN=' }) -replace '^CHROMA_SERVICE_TOKEN=', ''
$env:EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
$env:CHROMA_PATH = './chroma_data'
$env:CHROMA_COLLECTION = 'gigsy_gigs'
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

The first startup downloads the model and requires internet access. Later inference runs locally. Chroma data persists under `semantic_service/chroma_data`.

## 4. Start Next.js (PowerShell terminal 2)

From the repository root:

```powershell
npm ci
npm run dev
```

Restart Next.js after changing `.env.local`.

## 5. Verify and index gigs

Check `http://localhost:8001/health` and `http://localhost:3000/api/health`.

Index currently open gigs from the Next.js terminal:

```powershell
$secret = Read-Host "Enter your INDEXING_SECRET"
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/index-gigs -Headers @{"x-indexing-secret"=$secret}
```

Use the application's Match page to test natural-language discovery.

## Notes

- No OpenAI API key or hosted vector database is required for this local setup.
- The initial model download requires internet access.
- ChromaDB data and Python virtual environments are local generated data; do not commit them.
- For deployment, host FastAPI and persistent Chroma storage on an appropriate server. A deployed application cannot use your laptop's `127.0.0.1` address.
