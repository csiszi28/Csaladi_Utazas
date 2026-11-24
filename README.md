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

## Adatbázis (Prisma Migrate)

A séma változásait a [`packages/database/prisma/migrations`](packages/database/prisma/migrations) mappa követi (Prisma Migrate, az állapot a `_prisma_migrations` táblában). A régi, kézzel futtatott SQL fájlok a [`legacy-sql`](packages/database/prisma/legacy-sql) mappában vannak, archívumként.

Add meg a `DATABASE_URL` és `DIRECT_URL` értékeket az `apps/web/.env.local` és a `packages/database/.env` fájlban is (a jelszót a Supabase Dashboard → Project Settings → Database → Connection string alatt találod).

```env
# Pooler (port 6543) – alkalmazás használja
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[JELSZO]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (port 5432) – migrációkhoz
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[JELSZO]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**Új, üres adatbázis:** `npx pnpm db:migrate:deploy` (minden migrációt sorrendben lefuttat, az RLS-t és az auth triggert is).

**Séma módosítása:** szerkeszd a `schema.prisma`-t, majd lokális/fejlesztői adatbázison `npx pnpm db:migrate` (új migrációt generál), commitold a `migrations` mappát. Élesben: `npx pnpm db:migrate:deploy`. Ne használj `db:push`-t élesre.

**Meglévő éles adatbázis (egyszeri átállás):** lásd [`packages/database/prisma/migrations/README.md`](packages/database/prisma/migrations/README.md).

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

## Monorepo struktúra

```
apps/web          — Next.js frontend
packages/shared   — Zod sémák, dátum utilok
packages/database — Prisma séma és client
```

