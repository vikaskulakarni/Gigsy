# Gigsy: free local semantic matching (MySQL + ChromaDB + Sentence Transformers)

The existing Next.js UI, MySQL database, authentication, dashboards, proposals, projects, profile and messaging are retained. Only the semantic-search infrastructure changes: OpenAI embeddings and Qdrant are replaced by a local Python service running ChromaDB and `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, cosine distance).

## 1. Configure Next.js

In the project root `.env.local`, keep your existing working MySQL and `SESSION_SECRET` values. Remove the old `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, and `QDRANT_COLLECTION` entries. Add:

```env
CHROMA_SERVICE_URL=http://127.0.0.1:8001
CHROMA_SERVICE_TOKEN=PASTE_A_LONG_RANDOM_SECRET_HERE
INDEXING_SECRET=YOUR_EXISTING_INDEXING_SECRET
```

Generate a token in PowerShell with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the same `CHROMA_SERVICE_TOKEN` in `semantic_service/.env` (create it by copying `.env.example`). Do not share tokens or commit `.env.local` / `.env`.

## 2. Install and start the Python service (PowerShell terminal 1)

Python 3.11 or 3.12 is recommended for the broadest Windows/PyTorch wheel compatibility. From the project root:

```powershell
cd semantic_service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `semantic_service/.env` and set `CHROMA_SERVICE_TOKEN` to exactly the same value as the Next.js `.env.local`. Then load the values and start the service:

```powershell
$env:CHROMA_SERVICE_TOKEN = (Get-Content .env | Where-Object { $_ -match '^CHROMA_SERVICE_TOKEN=' }) -replace '^CHROMA_SERVICE_TOKEN=', ''
$env:EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
$env:CHROMA_PATH = './chroma_data'
$env:CHROMA_COLLECTION = 'gigsy_gigs'
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

First startup downloads the model from Hugging Face; allow it to finish. The model then runs locally. ChromaDB data persists in `semantic_service/chroma_data`.

## 3. Start Next.js (PowerShell terminal 2)

From the project root:

```powershell
npm install
npm run dev
```

Restart Next.js after changing `.env.local`.

## 4. Verify and index

Open `http://localhost:8001/health`; expect `ok: true`, `vector_db: ChromaDB`, and embedding dimensions 384. Open `http://localhost:3000/api/health` to verify MySQL.

In PowerShell terminal 2, index all currently Open gigs:

```powershell
$secret = Read-Host "Enter your INDEXING_SECRET"
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/index-gigs -Headers @{"x-indexing-secret"=$secret}
```

Expected response includes `success: true`, `indexed: <number>`, `collection: gigsy_gigs`, `vectorDatabase: ChromaDB`, and `embeddingModel: all-MiniLM-L6-v2`.

Then sign in to Gigsy and use the existing Match page. The query is embedded locally and ChromaDB returns nearest gigs by cosine similarity; results are checked against MySQL so closed gigs are not displayed.

## Notes

- No OpenAI API key, API billing, Qdrant account, or cloud vector database is needed.
- The model is free to download/use under its model license; first download requires internet. Inference and vector search run locally afterward.
- This is a local-development architecture. For deployment, host the Python service and persistent Chroma storage on a server that can run Python/PyTorch; do not point a public deployment at `127.0.0.1` on your laptop.
- ChromaDB is the vector database; MySQL remains the source of truth for gig status, budgets and transactional data.
