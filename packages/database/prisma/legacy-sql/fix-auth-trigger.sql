-- =============================================================================
-- JAVÍTÁS v2: "relation public.profiles does not exist" regisztráció 500
-- =============================================================================
-- Futtasd: Supabase Dashboard → SQL Editor → jqybsriyxumberwgnsto projekt
-- ELŐFELTÉTEL: init.sql már lefutott (public.users tábla létezik)
-- =============================================================================

-- 1) DIAGNOSZTIKA – eredmény a Results fülön (másold ide, ha még mindig hibás)
SELECT 'TRIGGER on auth.users' AS tipus, t.tgname AS nev, n.nspname AS func_schema, p.proname AS func_nev
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal;

SELECT 'FUNCTION with profiles' AS tipus, n.nspname AS schema, p.proname AS nev
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%profiles%'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema');

-- 2) ÖSSZES egyedi trigger törlése auth.users-ről (nem csak egy név)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
    RAISE NOTICE 'Dropped trigger: %', r.tgname;
  END LOOP;
END $$;

-- 3) ÖSSZES public (és supabase_functions) függvény törlése, ami profiles-ra hivatkozik
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosrc ILIKE '%profiles%'
      AND n.nspname IN ('public', 'supabase_functions', 'extensions')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.func_signature);
    RAISE NOTICE 'Dropped function: %', r.func_signature;
  END LOOP;
END $$;

-- 4) Ismert régi nevek (extra biztonság)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user(trigger) CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user(trigger) CASCADE;

-- 5) Helyes trigger: auth.users → public.users (Prisma séma)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 6) ELLENŐRZÉS – csak ez az egy trigger maradjon
SELECT t.tgname, p.proname, LEFT(p.prosrc, 80) AS func_start
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal;
