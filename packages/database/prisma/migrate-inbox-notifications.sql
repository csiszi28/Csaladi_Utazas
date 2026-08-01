-- Tartós inbox értesítések (pl. közreműködő eltávolítása az utazásból)
-- Futtasd a Supabase SQL Editorban.

CREATE TABLE IF NOT EXISTS "user_inbox_notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "tripId" TEXT,
  "tripTitle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dismissedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "user_inbox_notifications_userId_dismissedAt_idx"
  ON "user_inbox_notifications"("userId", "dismissedAt");

CREATE INDEX IF NOT EXISTS "user_inbox_notifications_userId_createdAt_idx"
  ON "user_inbox_notifications"("userId", "createdAt");
