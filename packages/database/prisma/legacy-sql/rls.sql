-- =============================================================================
-- 2. LÉPÉS: Row Level Security policy-k
-- =============================================================================
-- ELŐFELTÉTEL: A tábláknak már létezniük kell!
-- Ha hibát kapsz ("relation users does not exist"), futtasd előbb az init.sql-t:
--   packages/database/prisma/init.sql
-- VAGY lokálisan: npx pnpm db:push  (DATABASE_URL + DIRECT_URL szükséges)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'A "users" tabla nem letezik. Futtasd eloszor az init.sql fajlt (packages/database/prisma/init.sql), majd ezt ujra.';
  END IF;
END $$;

-- Column names match Prisma camelCase (quoted in PostgreSQL)ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users: own record only
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid()::text);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid()::text);

-- Family members: owned by user
CREATE POLICY "family_members_select" ON family_members FOR SELECT USING ("userId" = auth.uid()::text);
CREATE POLICY "family_members_insert" ON family_members FOR INSERT WITH CHECK ("userId" = auth.uid()::text);
CREATE POLICY "family_members_update" ON family_members FOR UPDATE USING ("userId" = auth.uid()::text);
CREATE POLICY "family_members_delete" ON family_members FOR DELETE USING ("userId" = auth.uid()::text);

-- Trips: owned by user
CREATE POLICY "trips_select" ON trips FOR SELECT USING ("userId" = auth.uid()::text);
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK ("userId" = auth.uid()::text);
CREATE POLICY "trips_update" ON trips FOR UPDATE USING ("userId" = auth.uid()::text);
CREATE POLICY "trips_delete" ON trips FOR DELETE USING ("userId" = auth.uid()::text);

-- Trip participants: via trip ownership
CREATE POLICY "trip_participants_select" ON trip_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_participants."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "trip_participants_insert" ON trip_participants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_participants."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "trip_participants_delete" ON trip_participants FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_participants."tripId" AND trips."userId" = auth.uid()::text));

-- Programs: via trip ownership
CREATE POLICY "programs_select" ON programs FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "programs_insert" ON programs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "programs_update" ON programs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "programs_delete" ON programs FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = programs."tripId" AND trips."userId" = auth.uid()::text));

-- Program participants: via trip ownership
CREATE POLICY "program_participants_select" ON program_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM programs
    JOIN trips ON trips.id = programs."tripId"
    WHERE programs.id = program_participants."programId" AND trips."userId" = auth.uid()::text
  ));
CREATE POLICY "program_participants_insert" ON program_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM programs
    JOIN trips ON trips.id = programs."tripId"
    WHERE programs.id = program_participants."programId" AND trips."userId" = auth.uid()::text
  ));
CREATE POLICY "program_participants_delete" ON program_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM programs
    JOIN trips ON trips.id = programs."tripId"
    WHERE programs.id = program_participants."programId" AND trips."userId" = auth.uid()::text
  ));

-- Costs: via trip ownership
CREATE POLICY "costs_select" ON costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "costs_insert" ON costs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "costs_update" ON costs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "costs_delete" ON costs FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = costs."tripId" AND trips."userId" = auth.uid()::text));

-- Documents: via trip ownership
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = documents."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = documents."tripId" AND trips."userId" = auth.uid()::text));
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = documents."tripId" AND trips."userId" = auth.uid()::text));

-- Storage bucket: create in Supabase Dashboard
-- Bucket name: trip-documents (private)
