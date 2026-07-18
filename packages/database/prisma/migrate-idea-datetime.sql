-- Program ötletek dátum / időpont mezői
ALTER TABLE trip_ideas ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE trip_ideas ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE trip_ideas ADD COLUMN IF NOT EXISTS "endTime" TEXT;
