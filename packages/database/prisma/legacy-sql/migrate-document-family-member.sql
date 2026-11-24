-- Dokumentumok: családtag hozzárendelés (kihez tartozik a feltöltött irat)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "familyMemberId" TEXT
  REFERENCES family_members(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS documents_familyMemberId_idx ON documents("familyMemberId");
