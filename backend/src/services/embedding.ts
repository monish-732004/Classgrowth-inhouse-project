// Thin client for the local Python embedding microservice.
// All vector computation stays in the Python service — no LLM API calls here.

const EMBED_URL = process.env.EMBEDDING_SERVICE_URL ?? 'http://localhost:8000';

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${EMBED_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Embedding service error: ${res.status}`);
  const data = await res.json() as { embedding: number[] };
  return data.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${EMBED_URL}/embed/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Embedding service error: ${res.status}`);
  const data = await res.json() as { embeddings: number[][] };
  return data.embeddings;
}
