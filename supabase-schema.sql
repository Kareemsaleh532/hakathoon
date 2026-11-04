-- ============================================================
-- GREENOVATE HACKATHON DATABASE SCHEMA FOR SUPABASE
-- ============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'judge', 'participant')),
  phone TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  team_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRITERIA TABLE
CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  max_score NUMERIC NOT NULL DEFAULT 25,
  weight NUMERIC DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  max_members INTEGER DEFAULT 4,
  track TEXT DEFAULT 'المسار العام للبيئة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  track TEXT DEFAULT '',
  description TEXT DEFAULT '',
  target_impact TEXT DEFAULT '',
  deliverables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  team_name TEXT NOT NULL,
  members TEXT NOT NULL,
  project_title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  file_size BIGINT DEFAULT 0,
  file_link TEXT DEFAULT '',
  challenge_id TEXT DEFAULT '',
  challenge_title TEXT DEFAULT '',
  environmental_impact TEXT DEFAULT '',
  demo_url TEXT DEFAULT '',
  repo_url TEXT DEFAULT '',
  presentation_url TEXT DEFAULT '',
  submitted_by_user_id TEXT,
  submitted_by_user_name TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  team_id TEXT DEFAULT '',
  judge_id TEXT NOT NULL,
  judge_name TEXT DEFAULT '',
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC NOT NULL DEFAULT 0,
  feedback TEXT DEFAULT '',
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'app_settings',
  is_submission_open BOOLEAN NOT NULL DEFAULT false,
  announcement TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted API read and write
DROP POLICY IF EXISTS "public_all_users" ON users;
CREATE POLICY "public_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_criteria" ON criteria;
CREATE POLICY "public_all_criteria" ON criteria FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_teams" ON teams;
CREATE POLICY "public_all_teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_challenges" ON challenges;
CREATE POLICY "public_all_challenges" ON challenges FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_submissions" ON submissions;
CREATE POLICY "public_all_submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_evaluations" ON evaluations;
CREATE POLICY "public_all_evaluations" ON evaluations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_settings" ON settings;
CREATE POLICY "public_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- INITIAL SEED DATA (ADMIN & SETTINGS)
-- ============================================================

INSERT INTO users (id, name, email, password, role, specialty)
VALUES ('admin-1', 'مدير الهاكاثون', 'admin@hackathon.com', 'admin', 'admin', 'إدارة')
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;

INSERT INTO settings (id, is_submission_open, announcement)
VALUES ('app_settings', false, '')
ON CONFLICT (id) DO NOTHING;

