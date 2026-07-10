-- Funkciók 7–12: profil összekapcsolás, dokumentum kategóriák
-- Futtasd a Supabase SQL Editorban vagy: npx pnpm db:push

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS "linkedUserId" TEXT
  REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS family_members_linkedUserId_key ON family_members("linkedUserId")
  WHERE "linkedUserId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS family_members_linkedUserId_idx ON family_members("linkedUserId");

ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'OTHER';

CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
