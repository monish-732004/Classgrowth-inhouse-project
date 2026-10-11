-- RPC functions for pgvector similarity queries
-- Called by the backend (not directly from the browser).

-- ============================================================
-- for_you_feed: personalized feed ranked by cosine similarity × urgency
-- ============================================================
CREATE OR REPLACE FUNCTION for_you_feed(
  p_user_id  UUID,
  p_embedding vector(384),
  p_limit     INT DEFAULT 30
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  summary         TEXT,
  link            TEXT,
  category        post_category,
  deadline        TIMESTAMPTZ,
  audience_filter JSONB,
  link_status     TEXT,
  is_archived     BOOLEAN,
  created_at      TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_by      UUID,
  section_id      UUID,
  similarity      FLOAT,
  score           FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.summary,
    p.link,
    p.category,
    p.deadline,
    p.audience_filter,
    p.link_status,
    p.is_archived,
    p.created_at,
    p.published_at,
    p.created_by,
    p.section_id,
    1 - (p.post_embedding <=> p_embedding)    AS similarity,
    (1 - (p.post_embedding <=> p_embedding))
      * urgency_score(p.deadline)             AS score
  FROM posts p
  WHERE
    p.is_archived = FALSE
    AND p.post_embedding IS NOT NULL
  ORDER BY score DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- semantic_search: nearest-neighbour search over post embeddings
-- ============================================================
CREATE OR REPLACE FUNCTION semantic_search(
  p_embedding vector(384),
  p_limit     INT DEFAULT 20
)
RETURNS TABLE (
  id           UUID,
  title        TEXT,
  summary      TEXT,
  link         TEXT,
  category     post_category,
  deadline     TIMESTAMPTZ,
  link_status  TEXT,
  is_archived  BOOLEAN,
  created_at   TIMESTAMPTZ,
  similarity   FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.summary,
    p.link,
    p.category,
    p.deadline,
    p.link_status,
    p.is_archived,
    p.created_at,
    1 - (p.post_embedding <=> p_embedding) AS similarity
  FROM posts p
  WHERE
    p.is_archived = FALSE
    AND p.post_embedding IS NOT NULL
  ORDER BY p.post_embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- ============================================================
-- deadline_feed: posts with upcoming deadlines sorted by urgency
-- ============================================================
CREATE OR REPLACE FUNCTION deadline_feed(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id           UUID,
  title        TEXT,
  summary      TEXT,
  link         TEXT,
  category     post_category,
  deadline     TIMESTAMPTZ,
  link_status  TEXT,
  is_archived  BOOLEAN,
  created_at   TIMESTAMPTZ,
  hours_left   FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, title, summary, link, category, deadline, link_status, is_archived, created_at,
    EXTRACT(EPOCH FROM (deadline - NOW())) / 3600.0 AS hours_left
  FROM posts
  WHERE
    deadline IS NOT NULL
    AND deadline > NOW()
    AND is_archived = FALSE
  ORDER BY deadline ASC
  LIMIT p_limit;
$$;
