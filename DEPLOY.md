# Vercel + PWA telepítési útmutató

## 1. GitHub

1. Push-old a repót GitHubra (ha még nincs fent).
2. Ellenőrizd, hogy a `public/icons/*.png` fájlok is benne vannak a commitban.

## 2. Vercel projekt

1. [vercel.com](https://vercel.com) → **Add New Project** → importáld a GitHub repót.
2. **Root Directory:** `apps/web` (fontos monorepo esetén!)
3. A `apps/web/vercel.json` automatikusan beállítja:
   - Install: `cd ../.. && pnpm install` (monorepo gyökérből)
   - Build: `pnpm build` (Next.js build az apps/web mappában)
4. **Deploy** — az első build után ellenőrizd: Deployments → zöld **Ready** státusz kell!

## 3. Környezeti változók (Vercel → Settings → Environment Variables)

Másold be a lokális `.env.local` értékeidből (Production + Preview + Development):

| Változó | Leírás |
|---------|--------|
| `NEXT_PUBLIC_SITE_URL` | Pl. `https://csaladi-utazas.vercel.app` (deploy után a valós URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (titkos!) |
| `DATABASE_URL` | Supabase pooler, port **6543**, `?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct/session, port **5432** |

> **Fontos:** A `NEXT_PUBLIC_SITE_URL`-t a Vercel domainre állítsd deploy után, majd redeploy!

## 4. Supabase beállítások

Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** `https://<vercel-domain>`
- **Redirect URLs** (add hozzá mindegyiket):
  - `https://<vercel-domain>/**`
  - `http://localhost:3000/**` (lokális fejlesztéshez)

Storage: ellenőrizd, hogy a dokumentum bucket és RLS szabályok élesben is aktívak.

Adatbázis: futtasd a migráció SQL fájlokat a Supabase SQL Editorban, ha még nem tetted.

## 5. PWA telepítés telefonon

### Android (Chrome)
1. Nyisd meg az éles URL-t.
2. Jelentkezz be.
3. Megjelenik az alsó **„Telepítés”** sáv, vagy: menü → **Telepítés / Add to Home screen**.

### iPhone (Safari)
1. Nyisd meg az éles URL-t Safari-ban.
2. **Megosztás** (⬆️) → **Hozzáadás a kezdőképernyőhöz**.
3. Az app önálló ablakban indul (`standalone` mód).

### Ellenőrzés
- Chrome DevTools → Application → Manifest + Service Workers
- Éles buildben (`NODE_ENV=production`) regisztrálódik a `/sw.js`

## 6. Ikonok újragenerálása (opcionális)

```bash
cd apps/web
node scripts/generate-icons.mjs
```

## 7. Gyakori hibák

| Probléma | Megoldás |
|----------|----------|
| Build: Prisma client hiányzik | `pnpm install` fut a rootból; database package `postinstall` generál |
| Auth redirect hiba | Supabase Redirect URLs + `NEXT_PUBLIC_SITE_URL` |
| PWA nem telepíthető | HTTPS kell (Vercel ad), manifest + 192/512 ikonok |
| Service worker nincs dev-ben | Szándékos — csak production buildben aktív |
| **„Valami hiba történt”** éles oldalon | Nyisd meg: `https://<domain>/api/health` — hiányzó env vagy DB hiba |
| **404 DEPLOYMENT_NOT_FOUND** | Nincs sikeres deploy — Vercel → Deployments → nézd a build logot, majd Redeploy |
| Build failed (turbo/pnpm) | Root Directory = `apps/web`, vercel.json: `pnpm build` |
| Server Components render error | Vercel env változók + Redeploy; Supabase migrációk |
| `missingEnv` a health válaszban | Add hozzá a 6 env változót, pipáld: Production + Preview |
| `database.ok: false` | DATABASE_URL (6543 pooler), jelszó URL-kódolás, init.sql + rls.sql |
| Prisma `rhel-openssl-3.0.x` engine not found | `binaryTargets` a schema.prisma-ban + redeploy (automatikusan javítva a repóban) |
| Manifest / CORS hiba preview URL-en | Használd a production domaint (`*.vercel.app`), ne a `-xxx-projects.vercel.app` preview linket; vagy kapcsold ki a Deployment Protection-t |

## 8. Egyéni domain (opcionális, ingyenes Vercel tieren)

Vercel → Project → Domains → add custom domain → DNS beállítás után frissítsd:
- `NEXT_PUBLIC_SITE_URL`
- Supabase Site URL + Redirect URLs

## 6. Opcionális változók és karbantartás

| Változó | Leírás |
|---------|--------|
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Auth e-mailek (Resend) |
| `NEXT_PUBLIC_MAPTILER_KEY` | Térképcsempék |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push értesítések |
| `CRON_SECRET` | A `/api/cron/*` végpontok védelme (`Authorization: Bearer <secret>`). A middleware ezeket nem irányítja át a bejelentkezésre, a végpont maga ellenőriz. |

- **Adatbázis-index:** a `trips(userId, startDate)` összetett index a sémában szerepel. Élesben egyszer futtasd a Supabase SQL Editorban: `packages/database/prisma/migrate-trips-user-start-index.sql`.
- **CI:** `.github/workflows/ci.yml` minden pushnál/PR-nál futtatja a teszteket, a típusellenőrzést, a lintet és a buildet.
- **Sebességkorlát:** az API-k felhasználónként 120 kérés/perc (url-preview: 30/perc) korlátot kapnak, példányonként számolva. Szigorúbb, globális korláthoz Upstash Redis kell.
- **Hibafigyelés:** a szerveroldali hibák egységes JSON-ként kerülnek a Vercel Logs-ba (`src/instrumentation.ts`). Sentry bekötéséhez ide kell a DSN és az SDK.
