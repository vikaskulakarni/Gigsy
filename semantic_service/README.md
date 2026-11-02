# Gigsy local semantic service

This local Python service runs Sentence Transformers (`all-MiniLM-L6-v2`) and ChromaDB. It does not call OpenAI or any paid embedding API. The model is downloaded from Hugging Face on first startup and then runs locally; first startup requires an internet connection. Chroma persists its collection under `semantic_service/chroma_data`.

## Windows setup (PowerShell)

Use Python 3.11 or 3.12 for the smoothest compatibility with PyTorch/Sentence Transformers.

```powershell
cd semantic_service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `CHROMA_SERVICE_TOKEN` in `.env` to the same value as `CHROMA_SERVICE_TOKEN` in the Next.js `.env.local`. Start the service:

```powershell
$env:CHROMA_SERVICE_TOKEN = (Get-Content .env | Where-Object { $_ -match '^CHROMA_SERVICE_TOKEN=' }) -replace '^CHROMA_SERVICE_TOKEN=', ''
$env:EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
$env:CHROMA_PATH = './chroma_data'
$env:CHROMA_COLLECTION = 'gigsy_gigs'
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Keep this terminal running. On first use, Sentence Transformers downloads the model files. Later runs use the local cache.

## Endpoints

- `GET /health` — service and collection status.
- `POST /index` — upsert gig descriptions and embeddings.
- `POST /search` — embed a search query and return nearest gig IDs by cosine similarity.

The service requires the `x-service-token` header for indexing and search. The Next.js API routes call it server-to-server, so the browser never receives this token.
