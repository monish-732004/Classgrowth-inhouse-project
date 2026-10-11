-- ClassGrowth v2 migration
-- Extends the existing schema with multi-tenancy, roles, deadline intelligence,
-- personalization, action tracking, semantic search, and analytics.
-- All changes are additive — no existing columns or rows are dropped.

-- ============================================================
-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. Expand user_role enum
-- ============================================================
-- Existing values: 'admin', 'student'
-- New values: 'fa' (Faculty Advisor), 'co_fa', 'cr' (Class Rep)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fa';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'co_fa';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cr';

-- ============================================================
-- 2. Multi-tenant hierarchy: colleges → departments → sections
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL UNIQUE, -- e.g. "srmist.edu.in" for email gating
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id  UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,          -- e.g. "CSE-A 2023-27"
  academic_year  TEXT NOT NULL,          -- e.g. "2023-27"
  batch          TEXT NOT NULL,          -- e.g. "2023"
  invite_code    TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Alter existing profiles table
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS section_id  UUID REFERENCES sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fcm_token   TEXT;

-- ============================================================
-- 4. Student profiles (branch, year, CGPA band, career tracks, embedding)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  branch             TEXT,
  year               SMALLINT CHECK (year BETWEEN 1 AND 5),
  cgpa_band          TEXT,          -- e.g. "7-8", "8-9", "9+"
  career_tracks      TEXT[],        -- e.g. ARRAY['placement','research']
  profile_embedding  vector(384),
  active_hours_json  JSONB NOT NULL DEFAULT '{}',  -- { "0": 3, "1": 0, ... } (168 buckets: 7×24)
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. Alter posts table (deadline, embedding, link health, multi-tenant)
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS section_id       UUID REFERENCES sections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deadline         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audience_filter  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS post_embedding   vector(384),
  ADD COLUMN IF NOT EXISTS link_status      TEXT NOT NULL DEFAULT 'unchecked'
                                              CHECK (link_status IN ('ok', 'dead', 'redirect_login', 'unchecked')),
  ADD COLUMN IF NOT EXISTS link_checked_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_archived      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at     TIMESTAMPTZ;

-- ============================================================
-- 6. Alter post_views: add clicked_at
-- ============================================================
ALTER TABLE post_views
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Drop the UNIQUE constraint so multiple views of the same post are recorded
-- (we want a time-series, not a de-duped flag)
ALTER TABLE post_views DROP CONSTRAINT IF EXISTS post_views_user_id_post_id_key;

-- ============================================================
-- 7. Post actions (Saved → Applied → Shortlisted → Selected)
-- ============================================================
CREATE TYPE IF NOT EXISTS post_action_status AS ENUM (
  'saved', 'interested', 'applied', 'shortlisted', 'selected'
);

CREATE TABLE IF NOT EXISTS post_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  status          post_action_status NOT NULL,
  is_shared_with_fa BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

-- ============================================================
-- 8. Sessions (for active-hours computation)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. Notifications
-- ============================================================
CREATE TYPE IF NOT EXISTS notification_type AS ENUM (
  'deadline_reminder', 'new_post', 'daily_digest', 'link_dead'
);

CREATE TABLE IF NOT EXISTS notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id        UUID REFERENCES posts(id) ON DELETE CASCADE,
  type           notification_type NOT NULL,
  scheduled_for  TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. pgvector indexes (HNSW for fast ANN search)
-- ============================================================
CREATE INDEX IF NOT EXISTS posts_embedding_hnsw
  ON posts USING hnsw (post_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS student_profiles_embedding_hnsw
  ON student_profiles USING hnsw (profile_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Fallback full-text search index
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS posts_fts_idx ON posts USING GIN (fts);

-- ============================================================
-- 11. RLS on new tables
-- ============================================================
ALTER TABLE colleges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_actions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- colleges / departments / sections: readable by all authenticated users
CREATE POLICY "Authenticated users can read colleges"
  ON colleges FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read departments"
  ON departments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read sections"
  ON sections FOR SELECT USING (auth.role() = 'authenticated');

-- student_profiles: own row only
CREATE POLICY "Users manage their own student profile"
  ON student_profiles FOR ALL USING (auth.uid() = user_id);

-- post_actions: own rows; FA of same section can SELECT
CREATE POLICY "Users manage their own actions"
  ON post_actions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "FA can read shared actions in their section"
  ON post_actions FOR SELECT
  USING (
    is_shared_with_fa = TRUE
    AND EXISTS (
      SELECT 1 FROM profiles fa
      JOIN posts p ON p.section_id = (
        SELECT section_id FROM profiles WHERE id = auth.uid()
      )
      WHERE fa.id = auth.uid()
      AND fa.role IN ('fa', 'co_fa', 'admin')
      AND post_actions.post_id = p.id
    )
  );

-- sessions: own rows
CREATE POLICY "Users manage their own sessions"
  ON sessions FOR ALL USING (auth.uid() = user_id);

-- notifications: own rows
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 12. Helper function: urgency score for "For You" feed ranking
-- score = cosine_similarity * (1 + urgency_boost)
-- urgency_boost: 0 if no deadline, scales up to 2.0 as deadline approaches
-- ============================================================
CREATE OR REPLACE FUNCTION urgency_score(deadline TIMESTAMPTZ)
RETURNS FLOAT AS $$
DECLARE
  hours_left FLOAT;
BEGIN
  IF deadline IS NULL THEN RETURN 1.0; END IF;
  hours_left := EXTRACT(EPOCH FROM (deadline - NOW())) / 3600.0;
  IF hours_left <= 0 THEN RETURN 0.0; END IF;       -- archived / past
  IF hours_left <= 24 THEN RETURN 3.0; END IF;
  IF hours_left <= 72 THEN RETURN 2.0; END IF;
  IF hours_left <= 168 THEN RETURN 1.5; END IF;
  RETURN 1.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 13. Trigger: auto-archive posts when deadline passes
-- (runs on UPDATE; a cron job does the scheduled sweep)
-- ============================================================
CREATE OR REPLACE FUNCTION auto_archive_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline IS NOT NULL AND NEW.deadline < NOW() AND NOT NEW.is_archived THEN
    NEW.is_archived := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_archive ON posts;
CREATE TRIGGER trigger_auto_archive
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION auto_archive_post();

-- ============================================================
-- 14. Updated_at trigger for student_profiles and post_actions
-- ============================================================
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_actions_updated_at
  BEFORE UPDATE ON post_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
