-- Családtagok: opcionális e-mail cím (automatikus fiók-összekapcsoláshoz regisztrációkor)
-- Futtasd a Supabase SQL Editorban, vagy psql-lel a production adatbázison.

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS family_members_email_idx ON family_members(email);

COMMENT ON COLUMN family_members.email IS
  'Opcionális e-mail cím. Regisztrációkor egyezés esetén a profil automatikusan összekapcsolódik a User fiókkal.';
