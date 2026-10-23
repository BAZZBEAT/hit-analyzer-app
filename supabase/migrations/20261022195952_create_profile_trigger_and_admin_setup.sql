/*
# Create trigger for auto-profile creation and admin user setup

## Overview
1. Creates a trigger that automatically inserts a row in `profiles` when a new user signs up
2. Creates a SECURITY DEFINER function `set_admin_role` that the edge function uses to grant admin
3. Inserts the admin profile row for a pre-determined admin email

## Changes
- `handle_new_user()` trigger function: inserts a profile row on signup
- Trigger on auth.users AFTER INSERT
- `set_admin_role(p_email text)` function: sets role='admin' in both profiles and raw_app_meta_data
- Admin account email: admin@musicai.app (to be created via signUp)

## Security
- `handle_new_user` is SECURITY DEFINER so it can insert into profiles during signup
- `set_admin_role` is SECURITY DEFINER, callable only by service_role (not anon/authenticated)
- The admin email is hardcoded in the edge function, not in the database
*/

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to set admin role (called by edge function with service_role key)
CREATE OR REPLACE FUNCTION set_admin_role(p_email text)
RETURNS TABLE (success boolean, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only service_role can call this (edge function checks auth header)
  -- Find user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  -- Update profile role
  UPDATE profiles SET role = 'admin' WHERE id = v_user_id;

  -- Update app_metadata (user-immutable)
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = v_user_id;

  RETURN QUERY SELECT true, v_user_id;
END;
$$;

-- Revoke public access to set_admin_role
REVOKE EXECUTE ON FUNCTION set_admin_role(text) FROM PUBLIC, anon, authenticated;
