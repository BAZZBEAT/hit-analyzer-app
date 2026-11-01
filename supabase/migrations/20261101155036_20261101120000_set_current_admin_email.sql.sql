/*
# Set the current administrator email

1. Purpose
- Replace the retired administrator email with beatmakerbazzbeat@gmail.com.
- Keep the administrator setup inside Supabase so the browser cannot grant roles by itself.

2. Modified data
- `profiles.role`: existing matching user is set to `admin`.
- `auth.users.raw_app_meta_data`: existing matching user receives the immutable `admin` role.
- `auth.users.email_confirmed_at`: existing matching user is confirmed.

3. Signup behavior
- The existing `handle_new_user` trigger now recognizes the current administrator email.
- A newly created matching account receives an admin profile and a confirmed email immediately.
- Other users continue to receive the regular `user` role.

4. Security
- Authorization remains based on `raw_app_meta_data`, not editable user metadata.
- The trigger remains `SECURITY DEFINER` with a fixed search path.
- No tables, columns, or user records are deleted.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = 'beatmakerbazzbeat@gmail.com' THEN
    INSERT INTO profiles (id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    UPDATE auth.users
    SET
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = NEW.id;
  ELSE
    INSERT INTO profiles (id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'beatmakerbazzbeat@gmail.com';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    UPDATE auth.users
    SET
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;
  END IF;
END $$;
