# Régi, kézzel futtatott SQL fájlok (archív)

Ezeket **ne futtasd újra**. 2026-11-24 óta a séma változásait a `../migrations` mappa Prisma Migrate migrációi követik.
A fájlok csak történeti referenciaként maradtak itt.

## Rekonstruált sorrend (a git-ben való megjelenés szerint)

1. `init.sql`, `rls.sql`, `fix-auth-trigger.sql` (alap + Supabase RLS/trigger)
2. `migrate-invite.sql`, `migrate-ideas.sql`, `migrate-idea-chat.sql`, `migrate-idea-category.sql`
3. `migrate-budget-settlement.sql`, `migrate-cost-amount-scope.sql`, `migrate-document-family-member.sql`
4. `migrate-features-7-12.sql`, `migrate-family-member-email.sql`, `migrate-family-member-link-request.sql`,
   `migrate-family-member-drop-linked-unique.sql`, `migrate-family-member-link-outcome.sql`
   (a `migrate-family-member-email-and-link.sql` ezek összevonása)
5. `migrate-idea-datetime.sql`, `migrate-cost-cascade.sql`, `migrate-feature-pack.sql`, `migrate-packing-quantity.sql`
6. `migrate-expansion-pack.sql`, `migrate-map-pack.sql` (utóbbi az előbbi vége)
7. `migrate-inbox-notifications.sql`, `migrate-push-subscriptions.sql`, `migrate-push-preferences.sql`
8. `migrate-family-member-is-child.sql`, `migrate-user-avatar.sql`, `migrate-trips-user-start-index.sql`

Az `accommodations` és `accommodation_participants` táblákat egyik fájl sem hozza létre (`db push`-sal készültek).
