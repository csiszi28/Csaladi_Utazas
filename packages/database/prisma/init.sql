-- =============================================================================
-- 1. LÉPÉS: Táblák létrehozása (futtasd ELŐSZÖR ezt a Supabase SQL Editorban)
-- =============================================================================
-- Ezután futtasd a rls.sql fájlt a Row Level Security policy-khez.
-- Alternatíva: Prisma db push (ha be van állítva a DATABASE_URL a .env-ben)

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_members (
  id       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name     TEXT NOT NULL,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS family_members_userId_idx ON family_members("userId");

CREATE TABLE IF NOT EXISTS trips (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  destination TEXT NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate"   TIMESTAMPTZ NOT NULL,
  "userId"    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS trips_userId_idx ON trips("userId");
CREATE INDEX IF NOT EXISTS trips_startDate_endDate_idx ON trips("startDate", "endDate");

CREATE TABLE IF NOT EXISTS trip_participants (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId"         TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "familyMemberId" TEXT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("tripId", "familyMemberId")
);

CREATE INDEX IF NOT EXISTS trip_participants_tripId_idx ON trip_participants("tripId");

CREATE TABLE IF NOT EXISTS programs (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId"  TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title     TEXT NOT NULL,
  date      TIMESTAMPTZ NOT NULL,
  "startTime" TEXT,
  "endTime"   TEXT,
  location  TEXT,
  url       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS programs_tripId_idx ON programs("tripId");
CREATE INDEX IF NOT EXISTS programs_date_idx ON programs(date);

CREATE TABLE IF NOT EXISTS program_participants (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "programId"      TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "familyMemberId" TEXT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("programId", "familyMemberId")
);

CREATE INDEX IF NOT EXISTS program_participants_programId_idx ON program_participants("programId");

CREATE TABLE IF NOT EXISTS costs (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId"  TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "programId" TEXT REFERENCES programs(id) ON DELETE SET NULL ON UPDATE CASCADE,
  amount    DOUBLE PRECISION NOT NULL,
  currency  TEXT NOT NULL DEFAULT 'HUF',
  category  TEXT NOT NULL,
  title     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS costs_tripId_idx ON costs("tripId");
CREATE INDEX IF NOT EXISTS costs_programId_idx ON costs("programId");

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId"    TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "programId" TEXT REFERENCES programs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "fileName"  TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType"  TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_tripId_idx ON documents("tripId");
CREATE INDEX IF NOT EXISTS documents_programId_idx ON documents("programId");
