-- Linked costs should delete with their parent program / accommodation / transport
-- (was ON DELETE SET NULL — left orphan costs behind)

ALTER TABLE "costs" DROP CONSTRAINT IF EXISTS "costs_programId_fkey";
ALTER TABLE "costs"
  ADD CONSTRAINT "costs_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "programs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "costs" DROP CONSTRAINT IF EXISTS "costs_accommodationId_fkey";
ALTER TABLE "costs"
  ADD CONSTRAINT "costs_accommodationId_fkey"
  FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "costs" DROP CONSTRAINT IF EXISTS "costs_transportId_fkey";
ALTER TABLE "costs"
  ADD CONSTRAINT "costs_transportId_fkey"
  FOREIGN KEY ("transportId") REFERENCES "transports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
