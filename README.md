# Családi Utazástervező

Web MVP a családi utazások tervezéséhez — Next.js 15, Supabase, Prisma, TanStack Query.

## Előfeltételek

- Node.js 20+
- pnpm 9+
- Supabase projekt (URL, anon key, service role key, DATABASE_URL, DIRECT_URL)

## Telepítés

```bash
pnpm install
```

Másold az `.env.example` fájlt `apps/web/.env.local` néven és töltsd ki a Supabase adatokkal:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
```

## Adatbázis (Supabase SQL Editor)

**Fontos sorrend:**

1. Futtasd az [`packages/database/prisma/init.sql`](packages/database/prisma/init.sql) fájlt a Supabase SQL Editorban (táblák létrehozása).
2. Ezután futtasd az [`packages/database/prisma/rls.sql`](packages/database/prisma/rls.sql) fájlt (biztonsági policy-k).
3. Ha már létező adatbázisod van, futtasd a migrációs fájlokat is sorrendben (pl. [`migrate-budget-settlement.sql`](packages/database/prisma/migrate-budget-settlement.sql), [`migrate-features-7-12.sql`](packages/database/prisma/migrate-features-7-12.sql), [`migrate-expansion-pack.sql`](packages/database/prisma/migrate-expansion-pack.sql)).

**Alternatíva (Prisma CLI):** Add hozzá a `DATABASE_URL` és `DIRECT_URL` értékeket az `apps/web/.env.local` fájlhoz és a `packages/database/.env` fájlba is (ugyanazok az értékek). A jelszót a Supabase Dashboard → Project Settings → Database → Connection string menüpontban találod.

```env
# Pooler (port 6543) – alkalmazás használja
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[JELSZO]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (port 5432) – migrációkhoz
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[JELSZO]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

```bash
npx pnpm db:generate
npx pnpm db:push
# majd rls.sql a Supabase SQL Editorban
```

Hozd létre a Storage bucket-et a Supabase Dashboardon:
- Név: `trip-documents`
- Public: false

## Fejlesztés

```bash
pnpm dev
```

Az alkalmazás a http://localhost:3000 címen érhető el.

## Éles telepítés (Vercel + PWA)

Lásd: [`DEPLOY.md`](DEPLOY.md)

## Funkciók

- Supabase Auth (regisztráció, bejelentkezés, elfelejtett jelszó)
- Családtagok kezelése (virtuális profilok)
- Utazások és programok CRUD
- Ötlet → program egy kattintással (becsült költség opcionális rögzítéssel)
- Ötlet szavazás (érdeklődés, határidő, elfogadva/elutasítva)
- Költségkezelés (HUF/EUR/USD/AED, kategóriák, ki fizette)
- Költségvetési limit és terv vs. tény összehasonlítás
- Elszámolás (ki kinek mennyit fizet)
- Központi naptár nézet + napi útiterv
- Utazás térkép (Leaflet + OpenStreetMap / Nominatim)
- Kimutatások (Recharts diagramok, elszámolás)
- iCal export és import (programok)
- Dokumentumfeltöltés (Supabase Storage) + fotóalbum (nap/hely)
- Csomagolási és dokumentum sablonok utazástípus szerint
- Meghívó link / mailto + szerepkörök (tulajdonos / szerkesztő / csak olvasás)
- Sablonkönyvtár és utazás utáni összefoglaló
- Offline napi útiterv mentés (PWA)
- Mobilbarát UI (viewport-alapú méretek) + PWA manifest
- Családtag ↔ regisztrált fiók összekapcsolás (profil átvétel meghívó után)
- REST API (`/api/v1/trips`, programs/costs/ideas/documents/day, `/api/v1/family`)
- URL előnézet ötleteknél (Open Graph)
- Unit tesztek a kritikus üzleti logikára (`packages/shared`)

### Adatbázis bővítés (expansion pack)

Futtasd a [`packages/database/prisma/migrate-expansion-pack.sql`](packages/database/prisma/migrate-expansion-pack.sql) fájlt a Supabase SQL Editorban (szerepkörök, sablonok, szavazás, geo, fotó mezők).

Ha a térképcsomag külön kell (közlekedés végpontok + fotó koordináták): [`migrate-map-pack.sql`](packages/database/prisma/migrate-map-pack.sql).

## Monorepo struktúra

```
apps/web          — Next.js frontend
packages/shared   — Zod sémák, dátum utilok
packages/database — Prisma séma és client
```

