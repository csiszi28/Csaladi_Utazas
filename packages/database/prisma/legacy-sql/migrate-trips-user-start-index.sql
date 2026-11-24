-- Összetett index az utazáslistákhoz és a naptárhoz (userId + startDate szerinti rendezés).
-- Biztonságosan újrafuttatható. Supabase Dashboard → SQL Editor → illeszd be → Run.

CREATE INDEX IF NOT EXISTS "trips_userId_startDate_idx" ON "trips" ("userId", "startDate");

-- A régi, egyoszlopos index fölöslegessé vált (az új lefedi a "userId" szerinti keresést).
DROP INDEX IF EXISTS "trips_userId_idx";
