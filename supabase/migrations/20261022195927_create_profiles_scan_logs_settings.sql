/*
# Create core tables for MusicAI: profiles, scan_logs, app_settings

## Overview
This migration creates the backend infrastructure for secure scan limits,
user roles (user vs admin), and admin dashboard statistics.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per user
- `role` (text, default 'user') — 'user' or 'admin'
- `created_at` (timestamptz)

### scan_logs
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users)
- `file_name` (text) — name of analyzed file
- `created_at` (timestamptz)

### app_settings
- `id` (int, PK, always 1 — singleton row)
- `daily_scan_limit` (int, default 1) — max scans per day for regular users
- `updated_at` (timestamptz)

## Security
- RLS enabled on all tables
- profiles: users can read/update only their own profile; admin can read all
- scan_logs: users can read only their own logs; admin can read all
- app_settings: only admin can read/update; regular users cannot access directly
- A SECURITY DEFINER function `check_and_record_scan` validates limits server-side
- A SECURITY DEFINER function `get_admin_stats` returns aggregate stats for admin only
- A SECURITY DEFINER function `get_scan_status` returns whether current user can scan
- A SECURITY DEFINER function `update_daily_limit` allows admin to change the limit

## Important Notes
1. The admin role is set via raw_app_meta_data (user-immutable), not user_metadata
2. Scan limit checking happens entirely server-side via SECURITY DEFINER functions
3. Regular users cannot read or modify app_settings directly
4. All limit logic is in PostgreSQL functions — no client-side trust
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Users can read their own profile
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (but NOT role — column-level grant below)
-- We revoke full UPDATE and grant only on non-sensitive columns
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (id) ON profiles TO authenticated;

-- Actually users shouldn't update their profile at all via direct table access
-- Role changes happen through admin edge functions only
REVOKE UPDATE ON profiles FROM authenticated;

-- Admin can read all profiles (handled via SECURITY DEFINER functions, not direct table access)
-- No direct admin policy needed — admin stats come through RPC

-- ============================================================
-- SCAN_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON scan_logs TO authenticated;

-- Users can read only their own scan logs
DROP POLICY IF EXISTS "select_own_scans" ON scan_logs;
CREATE POLICY "select_own_scans"
  ON scan_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for users directly — scans are recorded via SECURITY DEFINER function

-- ============================================================
-- APP_SETTINGS TABLE (singleton — id always = 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_scan_limit int NOT NULL DEFAULT 1 CHECK (daily_scan_limit >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert the singleton row
INSERT INTO app_settings (id, daily_scan_limit) VALUES (1, 1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- No direct grants to authenticated — only service_role (edge functions) and SECURITY DEFINER functions access this
GRANT SELECT ON app_settings TO service_role;

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================

-- Helper: check if current user is admin
-- Reads from raw_app_meta_data which is user-immutable
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Get scan status for the current user
-- Returns: { can_scan, scans_today, daily_limit, is_admin, time_until_reset_hours, time_until_reset_minutes }
CREATE OR REPLACE FUNCTION get_scan_status()
RETURNS TABLE (
  can_scan boolean,
  scans_today int,
  daily_limit int,
  is_admin boolean,
  time_until_reset_hours int,
  time_until_reset_minutes int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin boolean;
  v_limit int;
  v_count int;
  v_can_scan boolean;
  v_earliest timestamptz;
  v_remaining interval;
BEGIN
  -- Determine admin status
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) INTO v_admin;

  -- Get current limit
  SELECT daily_scan_limit INTO v_limit FROM app_settings WHERE id = 1;

  -- Count scans in the last 24 hours
  SELECT count(*) INTO v_count
  FROM scan_logs
  WHERE user_id = v_user_id
    AND created_at > now() - interval '24 hours';

  -- Admin bypasses all limits
  IF v_admin THEN
    v_can_scan := true;
    RETURN QUERY SELECT true, v_count::int, v_limit, true, 0, 0;
    RETURN;
  END IF;

  -- Check if user can scan
  v_can_scan := v_count < v_limit;

  -- Calculate time until reset (from earliest scan in the 24h window)
  IF NOT v_can_scan THEN
    SELECT created_at INTO v_earliest
    FROM scan_logs
    WHERE user_id = v_user_id
      AND created_at > now() - interval '24 hours'
    ORDER BY created_at ASC
    LIMIT 1;

    v_remaining := (v_earliest + interval '24 hours') - now();

    RETURN QUERY SELECT
      false,
      v_count::int,
      v_limit,
      false,
      GREATEST(EXTRACT(hour FROM v_remaining)::int, 0),
      GREATEST(EXTRACT(minute FROM v_remaining)::int, 0);
  ELSE
    RETURN QUERY SELECT true, v_count::int, v_limit, false, 0, 0;
  END IF;
END;
$$;

-- Check and record a scan atomically
-- Returns: { allowed, reason }
-- This is the ONLY way a scan gets recorded — prevents client-side tampering
CREATE OR REPLACE FUNCTION check_and_record_scan(p_file_name text DEFAULT NULL)
RETURNS TABLE (allowed boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin boolean;
  v_limit int;
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Не авторизован'::text;
    RETURN;
  END IF;

  -- Check admin status
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) INTO v_admin;

  -- Get current limit
  SELECT daily_scan_limit INTO v_limit FROM app_settings WHERE id = 1;

  -- Count scans in last 24 hours
  SELECT count(*) INTO v_count
  FROM scan_logs
  WHERE user_id = v_user_id
    AND created_at > now() - interval '24 hours';

  -- Admin bypasses limit
  IF v_admin THEN
    INSERT INTO scan_logs (user_id, file_name) VALUES (v_user_id, p_file_name);
    RETURN QUERY SELECT true, 'admin_bypass'::text;
    RETURN;
  END IF;

  -- Check limit
  IF v_count >= v_limit THEN
    RETURN QUERY SELECT false, 'limit_exceeded'::text;
    RETURN;
  END IF;

  -- Record the scan
  INSERT INTO scan_logs (user_id, file_name) VALUES (v_user_id, p_file_name);
  RETURN QUERY SELECT true, 'ok'::text;
END;
$$;

-- Get admin dashboard statistics
-- Only callable by admin
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users int,
  total_scans int,
  scans_today int,
  daily_limit int,
  active_users_24h int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
BEGIN
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) INTO v_admin;

  IF NOT v_admin THEN
    RAISE EXCEPTION 'Доступ запрещён: требуется права администратора';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::int FROM profiles),
    (SELECT count(*)::int FROM scan_logs),
    (SELECT count(*)::int FROM scan_logs WHERE created_at > now() - interval '24 hours'),
    (SELECT daily_scan_limit FROM app_settings WHERE id = 1),
    (SELECT count(DISTINCT user_id)::int FROM scan_logs WHERE created_at > now() - interval '24 hours');
END;
$$;

-- Update daily scan limit (admin only)
CREATE OR REPLACE FUNCTION update_daily_limit(p_limit int)
RETURNS TABLE (success boolean, new_limit int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
BEGIN
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) INTO v_admin;

  IF NOT v_admin THEN
    RAISE EXCEPTION 'Доступ запрещён: требуется права администратора';
  END IF;

  IF p_limit < 0 THEN
    RAISE EXCEPTION 'Лимит не может быть отрицательным';
  END IF;

  UPDATE app_settings SET daily_scan_limit = p_limit, updated_at = now() WHERE id = 1;

  RETURN QUERY SELECT true, p_limit;
END;
$$;

-- Get recent system logs for admin dashboard
CREATE OR REPLACE FUNCTION get_recent_logs(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  file_name text,
  created_at timestamptz,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
BEGIN
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  ) INTO v_admin;

  IF NOT v_admin THEN
    RAISE EXCEPTION 'Доступ запрещён: требуется права администратора';
  END IF;

  RETURN QUERY
  SELECT
    sl.id,
    sl.user_id,
    sl.file_name,
    sl.created_at,
    au.email
  FROM scan_logs sl
  LEFT JOIN auth.users au ON au.id = sl.user_id
  ORDER BY sl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- REVOKE + GRANT EXECUTE on functions
-- ============================================================
-- Public functions (callable by authenticated users)
REVOKE EXECUTE ON FUNCTION get_scan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_scan_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION check_and_record_scan(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION check_and_record_scan(text) TO authenticated;

-- Admin-only functions
REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION update_daily_limit(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_daily_limit(int) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_recent_logs(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recent_logs(int) TO authenticated;

-- is_admin helper is internal, not called directly by clients
REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon, authenticated;
