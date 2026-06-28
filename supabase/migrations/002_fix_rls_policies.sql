-- Migration 002 — Correction de la politique RLS coach_insert
-- Supprime la clause "OR coach_id IS NULL" qui permettait des insertions orphelines
-- (lignes sans propriétaire, accessibles à tous les coaches authentifiés).
-- Après ce correctif, seules les lignes dont coach_id = auth.uid() sont autorisées.

DROP POLICY IF EXISTS "coach_insert" ON app_storage;

CREATE POLICY "coach_insert" ON app_storage
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());
