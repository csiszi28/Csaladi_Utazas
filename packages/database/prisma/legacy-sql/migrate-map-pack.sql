-- Map expansion: transport endpoint coords + photo lat/lng
-- Futtasd a Supabase SQL Editorban, ha az expansion-pack már lefutott korábban.

ALTER TABLE "transports"
  ADD COLUMN IF NOT EXISTS "fromLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "fromLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "toLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "toLng" DOUBLE PRECISION;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
