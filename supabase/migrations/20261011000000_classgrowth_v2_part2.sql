-- ClassGrowth v2 migration — PART 2 of 2
-- Run AFTER 20261011000000_classgrowth_v2.sql has been committed.

-- ============================================================
-- 2. Multi-tenant hierarchy: colleges → departments → sections
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL UNIQUE,
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
  name           TEXT NOT NULL,
  academic_year  TEXT NOT NULL,
  batch          TEXT NOT NULL,
  invite_code    TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Alter existing profiles table
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS push_endpoint TEXT;  -- Web Push subscription endpoint (replaces fcm_token)

-- ============================================================
-- 4. Student profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  branch             TEXT,
  year               SMALLINT CHECK (year BETWEEN 1 AND 5),
  cgpa_band          TEXT,
  career_tracks      TEXT[],
  profile_embedding  vector(384),
  active_hours_json  JSONB NOT NULL DEFAULT '{}',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. Alter posts table
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
-- 6. Alter post_views
-- ============================================================
ALTER TABLE post_views
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

ALTER TABLE post_views DROP CONSTRAINT IF EXISTS post_views_user_id_post_id_key;

-- ============================================================
-- 7. Post actions
-- ============================================================
DO $$ BEGIN
  CREATE TYPE post_action_status AS ENUM (
    'saved', 'interested', 'applied', 'shortlisted', 'selected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS post_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  status            post_action_status NOT NULL,
  is_shared_with_fa BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

-- ============================================================
-- 8. Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. Notifications
-- ============================================================
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'deadline_reminder', 'new_post', 'daily_digest', 'link_dead'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
-- 10. pgvector indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS posts_embedding_hnsw
  ON posts USING hnsw (post_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS student_profiles_embedding_hnsw
  ON student_profiles USING hnsw (profile_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

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

CREATE POLICY "Authenticated users can read colleges"
  ON colleges FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read departments"
  ON departments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read sections"
  ON sections FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage their own student profile"
  ON student_profiles FOR ALL USING (auth.uid() = user_id);

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

CREATE POLICY "Users manage their own sessions"
  ON sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 12. Helper function: urgency score
-- ============================================================
CREATE OR REPLACE FUNCTION urgency_score(deadline TIMESTAMPTZ)
RETURNS FLOAT AS $$
DECLARE
  hours_left FLOAT;
BEGIN
  IF deadline IS NULL THEN RETURN 1.0; END IF;
  hours_left := EXTRACT(EPOCH FROM (deadline - NOW())) / 3600.0;
  IF hours_left <= 0  THEN RETURN 0.0; END IF;
  IF hours_left <= 24 THEN RETURN 3.0; END IF;
  IF hours_left <= 72 THEN RETURN 2.0; END IF;
  IF hours_left <= 168 THEN RETURN 1.5; END IF;
  RETURN 1.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 13. Trigger: auto-archive posts when deadline passes
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
-- 14. updated_at triggers for new tables
-- ============================================================
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_actions_updated_at
  BEFORE UPDATE ON post_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 15. Push subscriptions (Web Push, replaces Firebase FCM tokens)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own subscription"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
