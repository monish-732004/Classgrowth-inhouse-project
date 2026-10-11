"""
ClassGrowth Embedding Microservice
Runs all-MiniLM-L6-v2 (22 MB) locally — no external API calls.
"""
from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Load model once at startup
model = SentenceTransformer(MODEL_NAME)

app = FastAPI(title="ClassGrowth Embedding Service", version="1.0.0")


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]
    dim: int


class BatchEmbedRequest(BaseModel):
    texts: List[str]


class BatchEmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dim: int


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    vec = model.encode(body.text, normalize_embeddings=True).tolist()
    return EmbedResponse(embedding=vec, dim=len(vec))


@app.post("/embed/batch", response_model=BatchEmbedResponse)
def embed_batch(body: BatchEmbedRequest):
    if not body.texts:
        raise HTTPException(status_code=400, detail="texts must not be empty")
    if len(body.texts) > 256:
        raise HTTPException(status_code=400, detail="batch size limited to 256")
    vecs = model.encode(body.texts, normalize_embeddings=True, batch_size=32).tolist()
    return BatchEmbedResponse(embeddings=vecs, dim=len(vecs[0]) if vecs else 384)
