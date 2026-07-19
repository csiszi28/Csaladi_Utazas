-- F.A.M. feature pack: transport, activity, settlement payments, packing, cover, dismissals
-- Futtasd a Supabase SQL Editorban (vagy db:push után ellenőrizd).

ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "coverStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "coverMimeType" TEXT;

CREATE TABLE IF NOT EXISTS "transports" (
  "id" TEXT PRIMARY KEY,
  "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "departureDate" TIMESTAMP(3) NOT NULL,
  "departureTime" TEXT,
  "arrivalDate" TIMESTAMP(3),
  "arrivalTime" TEXT,
  "fromLocation" TEXT,
  "toLocation" TEXT,
  "bookingRef" TEXT,
  "url" TEXT,
  "note" TEXT,
  "ideaId" TEXT REFERENCES "trip_ideas"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "transports_tripId_idx" ON "transports"("tripId");
CREATE INDEX IF NOT EXISTS "transports_departureDate_idx" ON "transports"("departureDate");
CREATE INDEX IF NOT EXISTS "transports_ideaId_idx" ON "transports"("ideaId");

CREATE TABLE IF NOT EXISTS "transport_participants" (
  "id" TEXT PRIMARY KEY,
  "transportId" TEXT NOT NULL REFERENCES "transports"("id") ON DELETE CASCADE,
  "familyMemberId" TEXT NOT NULL REFERENCES "family_members"("id") ON DELETE CASCADE,
  UNIQUE ("transportId", "familyMemberId")
);

CREATE INDEX IF NOT EXISTS "transport_participants_transportId_idx"
  ON "transport_participants"("transportId");

CREATE TABLE IF NOT EXISTS "trip_activities" (
  "id" TEXT PRIMARY KEY,
  "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "actorUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "trip_activities_tripId_createdAt_idx"
  ON "trip_activities"("tripId", "createdAt");

CREATE TABLE IF NOT EXISTS "settlement_payments" (
  "id" TEXT PRIMARY KEY,
  "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "fromFamilyMemberId" TEXT NOT NULL REFERENCES "family_members"("id") ON DELETE CASCADE,
  "toFamilyMemberId" TEXT NOT NULL REFERENCES "family_members"("id") ON DELETE CASCADE,
  "amountHuf" INTEGER NOT NULL,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "settlement_payments_tripId_idx" ON "settlement_payments"("tripId");

CREATE TABLE IF NOT EXISTS "packing_items" (
  "id" TEXT PRIMARY KEY,
  "tripId" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "assigneeFamilyMemberId" TEXT REFERENCES "family_members"("id") ON DELETE SET NULL,
  "isPacked" BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "packing_items_tripId_idx" ON "packing_items"("tripId");

CREATE TABLE IF NOT EXISTS "user_notification_dismissals" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reminderKey" TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "reminderKey")
);

CREATE INDEX IF NOT EXISTS "user_notification_dismissals_userId_idx"
  ON "user_notification_dismissals"("userId");

ALTER TABLE "costs"
  ADD COLUMN IF NOT EXISTS "transportId" TEXT REFERENCES "transports"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "costs_transportId_idx" ON "costs"("transportId");

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "transportId" TEXT REFERENCES "transports"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "documents_transportId_idx" ON "documents"("transportId");
