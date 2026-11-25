-- Kifizetés hozzárendelése egy konkrét költséghez (üres = általános kifizetés).
-- FUTTASD LE a Supabase SQL Editorban MIELŐTT az ezt használó kód élesbe kerül.

ALTER TABLE "settlement_payments" ADD COLUMN IF NOT EXISTS "costId" TEXT;

ALTER TABLE "settlement_payments" DROP CONSTRAINT IF EXISTS "settlement_payments_costId_fkey";
ALTER TABLE "settlement_payments"
  ADD CONSTRAINT "settlement_payments_costId_fkey"
  FOREIGN KEY ("costId") REFERENCES "costs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "settlement_payments_costId_idx" ON "settlement_payments"("costId");
