-- ============================================================
-- Migration 001 — Enable Row Level Security on app_storage
-- ============================================================
-- Run this file in the Supabase SQL Editor (as service role).
--
-- Architecture reminder:
--   • Coaches  → Supabase email/password auth → role: authenticated
--   • Students → anonymous link token         → role: anon
--
-- Table: app_storage
--   key        TEXT  PRIMARY KEY
--   value      TEXT
--   updated_at TIMESTAMPTZ
--   coach_id   UUID  (added below — references auth.users)
--
-- Key namespace:
--   students:index      – list of all students    (coach only)
--   student:{id}        – individual student data  (coach + matching student)
--   chat:{id}           – chat messages            (coach + matching student w/ write)
--   gyms:index          – gym list                 (coach only)
--   planning:sessions   – sessions calendar        (coach only)
-- ============================================================


-- ── Step 1 : Ensure table exists with expected schema ──────────────────────
-- (Skip if you created the table via the Supabase Dashboard.)
CREATE TABLE IF NOT EXISTS app_storage (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Step 2 : Add coach_id column (idempotent) ──────────────────────────────
-- DEFAULT auth.uid() means every INSERT made by an authenticated user
-- automatically stamps the row with that coach's UUID — no app-code change needed.
ALTER TABLE app_storage
  ADD COLUMN IF NOT EXISTS coach_id UUID DEFAULT auth.uid();

-- ── Step 3 : Back-fill existing rows with the coach's UUID ─────────────────
-- Replace '<YOUR_COACH_UUID>' with the actual UUID from the Supabase
-- Authentication → Users tab, or run:
--   SELECT id FROM auth.users LIMIT 1;
-- then paste the result below and execute.
--
-- UPDATE app_storage
--   SET coach_id = '<YOUR_COACH_UUID>'
--   WHERE coach_id IS NULL;

-- ── Step 4 : Create index for RLS performance ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_app_storage_coach_id ON app_storage (coach_id);

-- ── Step 5 : Enable RLS ────────────────────────────────────────────────────
ALTER TABLE app_storage ENABLE ROW LEVEL SECURITY;

-- ── Step 6 : Drop stale policies (makes migration re-runnable) ────────────
DROP POLICY IF EXISTS "coach_select"         ON app_storage;
DROP POLICY IF EXISTS "coach_insert"         ON app_storage;
DROP POLICY IF EXISTS "coach_update"         ON app_storage;
DROP POLICY IF EXISTS "coach_delete"         ON app_storage;
DROP POLICY IF EXISTS "student_read"         ON app_storage;
DROP POLICY IF EXISTS "student_chat_insert"  ON app_storage;
DROP POLICY IF EXISTS "student_chat_update"  ON app_storage;


-- ══════════════════════════════════════════════════════════════
-- COACH POLICIES  (role: authenticated)
-- A coach can only access rows that belong to them (coach_id match).
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "coach_select" ON app_storage
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "coach_insert" ON app_storage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow insert if coach_id is their own UID or NULL (DEFAULT will fill it).
    coach_id = auth.uid() OR coach_id IS NULL
  );

CREATE POLICY "coach_update" ON app_storage
  FOR UPDATE
  TO authenticated
  USING  (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_delete" ON app_storage
  FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- STUDENT POLICIES  (role: anon)
-- Students use the anon key (no Supabase account).
-- Token validation (accessToken in URL vs. stored value) is
-- enforced in app code after the row is fetched — Supabase
-- cannot do per-student filtering without custom claims.
-- These policies restrict which KEY NAMESPACES are reachable.
-- ══════════════════════════════════════════════════════════════

-- Students may READ their own student record and chat thread.
-- Sensitive namespaces (students:index, gyms:index, planning:sessions)
-- are invisible to the anon role.
CREATE POLICY "student_read" ON app_storage
  FOR SELECT
  TO anon
  USING (key ~ '^(student:|chat:)');

-- Students may INSERT a chat row (first message ever in a thread).
-- PostgREST "prefer: resolution=merge-duplicates" triggers an upsert,
-- so both INSERT and UPDATE policies are required.
CREATE POLICY "student_chat_insert" ON app_storage
  FOR INSERT
  TO anon
  WITH CHECK (key ~ '^chat:');

-- Students may UPDATE an existing chat row (append new messages).
CREATE POLICY "student_chat_update" ON app_storage
  FOR UPDATE
  TO anon
  USING  (key ~ '^chat:')
  WITH CHECK (key ~ '^chat:');


-- ══════════════════════════════════════════════════════════════
-- VERIFICATION  (run after applying to confirm policies are live)
-- ══════════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename = 'app_storage';
--
-- SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE tablename = 'app_storage'
--   ORDER BY policyname;
