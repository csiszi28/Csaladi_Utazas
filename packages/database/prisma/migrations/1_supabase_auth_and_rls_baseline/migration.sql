-- Supabase-specifikus alap: auth.users -> public.users trigger + az eredeti 8 tábla RLS policy-jai.
-- Az init.sql, rls.sql és fix-auth-trigger.sql összevont, újrafuttatható változata.
-- Élesben ez már lefutott: `prisma migrate resolve --applied 1_supabase_auth_and_rls_baseline`.
-- Sima (nem Supabase) Postgresen (pl. shadow DB) az auth séma hiányában kihagyja magát.

DO $mig$
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'Nincs auth.uid() (nem Supabase) - kihagyva.';
    RETURN;
  END IF;

  EXECUTE $sql$
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, 'user'), '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

$sql$;

  EXECUTE $sql$
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users: own record only
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid()::text);
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid()::text);
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid()::text);

-- Family members: owned by user
DROP POLICY IF EXISTS "family_members_select" ON family_members;
CREATE POLICY "family_members_select" ON family_members FOR SELECT USING ("userId" = auth.uid()::text);
DROP POLICY IF EXISTS "family_members_insert" ON family_members;
CREATE POLICY "family_members_insert" ON family_members FOR INSERT WITH CHECK ("userId" = auth.uid()::text);
DROP POLICY IF EXISTS "family_members_update" ON family_members;
CREATE POLICY "family_members_update" ON family_members FOR UPDATE USING ("userId" = auth.uid()::text);
DROP POLICY IF EXISTS "family_members_delete" ON family_members;
CREATE POLICY "family_members_delete" ON family_members FOR DELETE USING ("userId" = auth.uid()::text);

-- Trips: owned by user
DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT USING ("userId" = auth.uid()::text);
DROP POLICY IF EXISTS "trips_insert" ON trips;
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK ("userId" = auth.uid()::text);
DROP POLICY IF EXISTS "trips_update" ON trips;
CREATE POLICY "trips_update" ON trips FOR UPDATE USING ("userId" = auth.uid()::text);
DROP POLICY IF EXISTS "trips_delete" ON trips;
CREATE POLICY "trips_delete" ON trips FOR DELETE USING ("userId" = auth.uid()::text);

-- Trip participants: via trip ownership
DROP POLICY IF EXISTS "trip_participants_select" ON trip_participants;
CREATE POLICY "trip_participants_select" ON trip_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_participants."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "trip_participants_insert" ON trip_participants;
CREATE POLICY "trip_participants_insert" ON trip_participants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_participants."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "trip_participants_delete" ON trip_participants;
CREATE POLICY "trip_participants_delete" ON trip_participants FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_participants."tripId" AND trips."userId" = auth.uid()::text));

-- Programs: via trip ownership
DROP POLICY IF EXISTS "programs_select" ON programs;
CREATE POLICY "programs_select" ON programs FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "programs_insert" ON programs;
CREATE POLICY "programs_insert" ON programs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "programs_update" ON programs;
CREATE POLICY "programs_update" ON programs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "programs_delete" ON programs;
CREATE POLICY "programs_delete" ON programs FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));

-- Program participants: via trip ownership
DROP POLICY IF EXISTS "program_participants_select" ON program_participants;
CREATE POLICY "program_participants_select" ON program_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM programs
    JOIN trips ON trips.id = programs."tripId"
    WHERE programs.id = program_participants."programId" AND trips."userId" = auth.uid()::text
  ));
DROP POLICY IF EXISTS "program_participants_insert" ON program_participants;
CREATE POLICY "program_participants_insert" ON program_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM programs
    JOIN trips ON trips.id = programs."tripId"
    WHERE programs.id = program_participants."programId" AND trips."userId" = auth.uid()::text
  ));
DROP POLICY IF EXISTS "program_participants_delete" ON program_participants;
CREATE POLICY "program_participants_delete" ON program_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM programs
    JOIN trips ON trips.id = programs."tripId"
    WHERE programs.id = program_participants."programId" AND trips."userId" = auth.uid()::text
  ));

-- Costs: via trip ownership
DROP POLICY IF EXISTS "costs_select" ON costs;
CREATE POLICY "costs_select" ON costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "costs_insert" ON costs;
CREATE POLICY "costs_insert" ON costs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "costs_update" ON costs;
CREATE POLICY "costs_update" ON costs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "costs_delete" ON costs;
CREATE POLICY "costs_delete" ON costs FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));

-- Documents: via trip ownership
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = documents."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = documents."tripId" AND trips."userId" = auth.uid()::text));
DROP POLICY IF EXISTS "documents_delete" ON documents;
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = documents."tripId" AND trips."userId" = auth.uid()::text));

-- Storage bucket: create in Supabase Dashboard
-- Bucket name: trip-documents (private)

$sql$;
END
$mig$;
