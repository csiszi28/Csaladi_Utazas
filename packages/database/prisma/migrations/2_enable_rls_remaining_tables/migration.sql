-- RLS bekapcsolása a maradék táblákon. Policy nélkül az anon/authenticated Supabase szerepkörök
-- (PostgREST, nyilvános anon kulcs) semmit nem érnek el. Az app Prisma-n át, a tábla tulajdonosaként
-- (postgres, BYPASSRLS) csatlakozik, ezért a működése nem változik. Többször futtatható.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "family_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_collaborators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_ideas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accommodations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accommodation_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transport_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_idea_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_idea_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "costs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlement_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "packing_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_notification_dismissals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_inbox_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_push_preferences" ENABLE ROW LEVEL SECURITY;
