-- Családtag profil bővítések: e-mail + függőben lévő összekapcsolási kérelem
-- Futtasd a Supabase SQL Editorban (egyszer, sorrendben).

-- 1. E-mail cím (automatikus / javasolt összekapcsoláshoz)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS family_members_email_idx ON family_members(email);

COMMENT ON COLUMN family_members.email IS
  'Opcionális e-mail cím. Regisztrációkor vagy összekapcsolási kérelemmel párosítható.';

-- 2. Függőben lévő összekapcsolási kérelem (a célfelhasználó megerősítésére vár)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "pendingLinkUserId" TEXT
  REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS family_members_pendingLinkUserId_idx
  ON family_members("pendingLinkUserId");

COMMENT ON COLUMN family_members."pendingLinkUserId" IS
  'Regisztrált felhasználó, akinek összekapcsolási kérelmet küldtek — megerősítésig várakozik.';

-- Egy fiók több profilhoz is kapcsolódhat (pl. saját + más család virtuális profilja)
DROP INDEX IF EXISTS family_members_linkedUserId_key;

CREATE INDEX IF NOT EXISTS family_members_linkedUserId_idx ON family_members("linkedUserId");
