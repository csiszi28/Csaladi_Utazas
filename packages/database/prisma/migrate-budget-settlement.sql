-- Költségvetés (utazás szint) és elszámolás (ki fizette a költséget)
-- Futtasd a Supabase SQL Editorban vagy: npx pnpm db:push

ALTER TABLE trips ADD COLUMN IF NOT EXISTS "budgetAmount" DOUBLE PRECISION;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS "budgetCurrency" TEXT NOT NULL DEFAULT 'HUF';

ALTER TABLE costs ADD COLUMN IF NOT EXISTS "paidByFamilyMemberId" TEXT
  REFERENCES family_members(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS costs_paidByFamilyMemberId_idx ON costs("paidByFamilyMemberId");
