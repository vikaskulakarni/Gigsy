from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import chromadb
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
CHROMA_PATH = Path(os.getenv("CHROMA_PATH", "./chroma_data")).resolve()
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "gigsy_gigs")
SERVICE_TOKEN = os.getenv("CHROMA_SERVICE_TOKEN", "")

app = FastAPI(title="Gigsy Local Semantic Search", version="1.0.0")
client = chromadb.PersistentClient(path=str(CHROMA_PATH))
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine", "description": "Gigsy gig description embeddings"},
)
model: SentenceTransformer | None = None


def authorize(token: str | None) -> None:
    if not SERVICE_TOKEN or token != SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized semantic service request")


def get_model() -> SentenceTransformer:
    global model
    if model is None:
        model = SentenceTransformer(MODEL_NAME)
    return model


class GigDocument(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=12000)
    title: str = Field(default="", max_length=500)
    skills: str = Field(default="", max_length=2000)


class IndexRequest(BaseModel):
    documents: list[GigDocument]


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=10, ge=1, le=50)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "vector_db": "ChromaDB",
        "collection": COLLECTION_NAME,
        "collection_count": collection.count(),
        "embedding_model": MODEL_NAME,
        "embedding_dimensions": 384,
    }


@app.post("/index")
def index_gigs(payload: IndexRequest, x_service_token: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(x_service_token)
    if not payload.documents:
        return {"success": True, "indexed": 0, "collection": COLLECTION_NAME}
    docs = payload.documents
    texts = [d.text for d in docs]
    vectors = get_model().encode(texts, normalize_embeddings=True).tolist()
    collection.upsert(
        ids=[d.id for d in docs],
        documents=texts,
        embeddings=vectors,
        metadatas=[{"gig_id": d.id, "title": d.title, "skills": d.skills} for d in docs],
    )
    return {"success": True, "indexed": len(docs), "collection": COLLECTION_NAME}


@app.post("/search")
def search_gigs(payload: SearchRequest, x_service_token: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(x_service_token)
    if collection.count() == 0:
        return {"success": True, "matches": []}
    vector = get_model().encode([payload.query], normalize_embeddings=True).tolist()[0]
    result = collection.query(
        query_embeddings=[vector],
        n_results=min(payload.top_k, collection.count()),
        include=["metadatas", "distances"],
    )
    ids = (result.get("ids") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    matches = []
    for gig_id, distance, metadata in zip(ids, distances, metadatas):
        matches.append({"gig_id": int(gig_id), "score": max(0.0, min(1.0, 1.0 - float(distance))), "metadata": metadata or {}})
    return {"success": True, "matches": matches}
