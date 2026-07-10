-- Meghívó kód és együttműködők (futtasd a Supabase SQL Editorban vagy: npx pnpm db:push)

ALTER TABLE trips ADD COLUMN IF NOT EXISTS "inviteCode" TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId"   TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "userId"   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("tripId", "userId")
);

CREATE INDEX IF NOT EXISTS trip_collaborators_userId_idx ON trip_collaborators("userId");
