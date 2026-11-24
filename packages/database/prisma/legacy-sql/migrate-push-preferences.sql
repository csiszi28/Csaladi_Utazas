-- Felhasználói push preferenciák (főkapcsoló + kategóriák JSON)
CREATE TABLE IF NOT EXISTS "user_push_preferences" (
  "userId" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "categories" TEXT NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
