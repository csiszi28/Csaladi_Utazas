-- Gyerek jelölés a családtagokon (elszámolásból kihagyva)
ALTER TABLE "family_members"
  ADD COLUMN IF NOT EXISTS "isChild" BOOLEAN NOT NULL DEFAULT false;
