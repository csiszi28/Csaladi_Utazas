-- Feature expansion pack: roles, trip type/templates, idea voting, photo albums, geo cache
-- Futtasd a Supabase SQL Editorban (vagy db:push után ellenőrizd).

ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "tripType" TEXT,
  ADD COLUMN IF NOT EXISTS "isTemplate" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "trips_isTemplate_idx" ON "trips"("isTemplate");

ALTER TABLE "trip_collaborators"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'EDITOR';

ALTER TABLE "trip_ideas"
  ADD COLUMN IF NOT EXISTS "voteDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decision" TEXT NOT NULL DEFAULT 'OPEN';

ALTER TABLE "programs"
  ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;

ALTER TABLE "accommodations"
  ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "takenAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "locationLabel" TEXT;

CREATE INDEX IF NOT EXISTS "documents_takenAt_idx" ON "documents"("takenAt");

-- Map pack: transport endpoints + photo coordinates
ALTER TABLE "transports"
  ADD COLUMN IF NOT EXISTS "fromLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fromLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "toLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "toLng" DOUBLE PRECISION;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
