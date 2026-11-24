# Migrációk

| Migráció | Mit csinál | Élesben (egyszeri átállás) |
|---|---|---|
| `0_init` | A teljes jelenlegi `schema.prisma` táblái, indexei, kulcsai | `migrate resolve --applied` (már létezik) |
| `1_supabase_auth_and_rls_baseline` | `auth.users` → `public.users` trigger + az eredeti 8 tábla RLS policy-jai (idempotens) | `migrate resolve --applied` (már lefutott) |
| `2_enable_rls_remaining_tables` | RLS bekapcsolása az összes táblán (policy nélkül = anon hozzáférés tiltva; a Prisma a `postgres` szerepkörrel megy, BYPASSRLS) | `migrate deploy` (ez az egyetlen, ami valóban fut) |

## Egyszeri átállás a meglévő éles adatbázison

A `packages/database` mappából, `DIRECT_URL`-lel az éles adatbázisra (port 5432):

```bash
# 0. Mentés! (Supabase Dashboard → Database → Backups, vagy pg_dump)

# 1. Eltérés az éles adatbázis és a séma között (üres diff = rendben)
npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script

# 2. Ha a diff nem üres, ne folytasd: nézzük meg, mi hiányzik / más élesben.

# 3. A már létező állapot jelölése lefutottnak
npx prisma migrate resolve --applied 0_init
npx prisma migrate resolve --applied 1_supabase_auth_and_rls_baseline

# 4. A hiányzó RLS élesítése és ellenőrzés
npx prisma migrate deploy
npx prisma migrate status
```

Utána az éles állapot a `_prisma_migrations` táblából olvasható.
