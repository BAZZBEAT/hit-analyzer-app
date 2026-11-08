/*
# Remove daily scan limits

1. Purpose
- The app is now free and unlimited for everyone.
- Scans are still logged for signed-in users so the admin activity journal keeps working.

2. Changed functions
- `check_and_record_scan(p_file_name)`: no longer checks any daily limit. It records the scan for signed-in users and always returns allowed.
- `get_scan_status()`: removed, because the app no longer shows or enforces limits.

3. Data
- No tables, columns, or rows are deleted. Existing `scan_logs` and `app_settings` values are kept.

4. Security
- The function stays SECURITY DEFINER with a fixed search path.
- Only signed-in users can write scan logs; anonymous calls return allowed without writing.
- EXECUTE is revoked from PUBLIC and anon for the rewritten function, and granted to authenticated and anon only where the app calls it.
*/

DROP FUNCTION IF EXISTS get_scan_status();

CREATE OR REPLACE FUNCTION check_and_record_scan(p_file_name text DEFAULT NULL::text)
RETURNS TABLE (allowed boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NOT NULL THEN
    INSERT INTO scan_logs (user_id, file_name) VALUES (v_user_id, p_file_name);
  END IF;

  RETURN QUERY SELECT true, 'ok'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION check_and_record_scan(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_and_record_scan(text) TO anon, authenticated;
