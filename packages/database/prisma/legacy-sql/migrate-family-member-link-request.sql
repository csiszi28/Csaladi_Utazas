-- Családtag profil: függőben lévő összekapcsolási kérelem (a célfelhasználó megerősítésére vár)
-- Futtasd a Supabase SQL Editorban.

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "pendingLinkUserId" TEXT
  REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS family_members_pendingLinkUserId_idx
  ON family_members("pendingLinkUserId");

COMMENT ON COLUMN family_members."pendingLinkUserId" IS
  'Regisztrált felhasználó, akinek összekapcsolási kérelmet küldtek — megerősítésig várakozik.';
