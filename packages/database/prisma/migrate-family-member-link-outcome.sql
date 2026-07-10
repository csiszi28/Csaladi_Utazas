-- Összekapcsolási kérelem kimenetele (elfogadva / elutasítva) — visszajelzés a küldőnek
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "linkProposalOutcome" TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "linkProposalOutcomeAt" TIMESTAMPTZ;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "linkProposalOutcomeSeenAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS family_members_linkProposalOutcome_idx
  ON family_members("linkProposalOutcome");

COMMENT ON COLUMN family_members."linkProposalOutcome" IS 'ACCEPTED vagy REJECTED — a küldő számára megjelenő visszajelzés.';
COMMENT ON COLUMN family_members."linkProposalOutcomeAt" IS 'Mikor dőlt el a kérelem.';
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "linkProposalRespondedUserId" TEXT
  REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS family_members_linkProposalRespondedUserId_idx
  ON family_members("linkProposalRespondedUserId");

COMMENT ON COLUMN family_members."linkProposalOutcomeSeenAt" IS 'Mikor nyomta el a küldő az értesítést.';
COMMENT ON COLUMN family_members."linkProposalRespondedUserId" IS 'Ki fogadta el vagy utasította el a kérelmet.';
