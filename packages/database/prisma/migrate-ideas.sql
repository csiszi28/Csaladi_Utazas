-- Ötletek blokk (futtasd a Supabase SQL Editorban vagy: npx pnpm db:push)

CREATE TABLE IF NOT EXISTS trip_ideas (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId"     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT,
  amount       DOUBLE PRECISION,
  currency     TEXT NOT NULL DEFAULT 'HUF',
  "amountScope" TEXT NOT NULL DEFAULT 'TOTAL',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_ideas_tripId_idx ON trip_ideas("tripId");

CREATE TABLE IF NOT EXISTS trip_idea_interests (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ideaId"         TEXT NOT NULL REFERENCES trip_ideas(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "familyMemberId" TEXT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("ideaId", "familyMemberId")
);

CREATE INDEX IF NOT EXISTS trip_idea_interests_ideaId_idx ON trip_idea_interests("ideaId");

ALTER TABLE programs ADD COLUMN IF NOT EXISTS "ideaId" TEXT REFERENCES trip_ideas(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS programs_ideaId_idx ON programs("ideaId");
