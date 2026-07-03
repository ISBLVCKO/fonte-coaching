-- ============================================================
-- Migration 003 — Inscription élève libre-service (#join)
--                 + validation serveur du token élève
-- ============================================================
-- À exécuter dans le Supabase SQL Editor.
--
-- Avant cette migration :
--   • Le formulaire #join était cassé : l'anon n'avait aucune policy
--     INSERT sur student:* → l'inscription échouait silencieusement.
--   • Tout le namespace student:*/chat:* était lisible par l'anon
--     (le contrôle du token se faisait uniquement côté client).
--
-- Après cette migration :
--   • Un anonyme peut créer une NOUVELLE fiche student:{id} rattachée
--     à un coach (coach_id fourni via le lien #join=<uid>).
--   • La lecture/écriture élève exige que le header x-student-token
--     corresponde à l'accessToken stocké dans la fiche élève.
-- ============================================================

-- ── 1. Fonction de vérification du token élève ─────────────────────────────
-- SECURITY DEFINER : lit la fiche student:{id} en bypassant RLS (évite la
-- récursion de policy) et compare son accessToken au header de la requête.
CREATE OR REPLACE FUNCTION student_token_ok(row_key text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_storage s
    WHERE s.key = 'student:' || split_part(row_key, ':', 2)
      AND s.value::json->>'accessToken' IS NOT NULL
      AND s.value::json->>'accessToken' =
          current_setting('request.headers', true)::json->>'x-student-token'
  );
$$;

REVOKE ALL ON FUNCTION student_token_ok(text) FROM public;
GRANT EXECUTE ON FUNCTION student_token_ok(text) TO anon, authenticated;

-- ── 2. Lecture élève : conditionnée au token ────────────────────────────────
DROP POLICY IF EXISTS "student_read" ON app_storage;
CREATE POLICY "student_read" ON app_storage
  FOR SELECT TO anon
  USING (key ~ '^(student:|chat:)' AND student_token_ok(key));

-- ── 3. Chat élève : insert/update conditionnés au token ────────────────────
-- coach_id IS NOT NULL sur l'insert : une conversation créée par l'élève doit
-- être rattachée au coach, sinon elle lui serait invisible (policy coach_select).
DROP POLICY IF EXISTS "student_chat_insert" ON app_storage;
CREATE POLICY "student_chat_insert" ON app_storage
  FOR INSERT TO anon
  WITH CHECK (key ~ '^chat:' AND coach_id IS NOT NULL AND student_token_ok(key));

DROP POLICY IF EXISTS "student_chat_update" ON app_storage;
CREATE POLICY "student_chat_update" ON app_storage
  FOR UPDATE TO anon
  USING  (key ~ '^chat:' AND student_token_ok(key))
  WITH CHECK (key ~ '^chat:' AND student_token_ok(key));

-- ── 4. Inscription libre-service (#join) ────────────────────────────────────
-- Un anonyme peut créer une NOUVELLE fiche élève rattachée à un coach.
-- Les fiches existantes ne peuvent pas être écrasées : il n'existe aucune
-- policy UPDATE anon sur student:* (l'upsert PostgREST échoue sur conflit).
DROP POLICY IF EXISTS "student_join_insert" ON app_storage;
CREATE POLICY "student_join_insert" ON app_storage
  FOR INSERT TO anon
  WITH CHECK (key ~ '^student:' AND coach_id IS NOT NULL);

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename = 'app_storage' ORDER BY policyname;
