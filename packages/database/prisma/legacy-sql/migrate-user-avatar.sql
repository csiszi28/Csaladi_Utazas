-- Profilkép a users táblán (Supabase Storage: trip-documents bucket)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "avatarStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "avatarMimeType" TEXT;
