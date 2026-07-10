-- Ötlet megjegyzés + chat (futtasd: npx pnpm db:push vagy Supabase SQL Editor)

ALTER TABLE trip_ideas ADD COLUMN IF NOT EXISTS note TEXT;

CREATE TABLE IF NOT EXISTS trip_idea_messages (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ideaId"   TEXT NOT NULL REFERENCES trip_ideas(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "userId"   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  body       TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_idea_messages_ideaId_createdAt_idx ON trip_idea_messages("ideaId", "createdAt");
