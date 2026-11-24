-- Web Push subscriptions (háttér értesítésekhez)
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "lastDigestDay" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_userId_endpoint_key"
  ON "push_subscriptions"("userId", "endpoint");

CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx"
  ON "push_subscriptions"("userId");
