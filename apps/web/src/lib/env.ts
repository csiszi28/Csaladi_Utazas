export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const DB_ENV_HINT =
  "Add hozzá a DATABASE_URL és DIRECT_URL értékeket az apps/web/.env.local fájlhoz " +
  "(Supabase Dashboard → Project Settings → Database → Connection string), majd indítsd újra a dev szervert.";

export function assertDatabaseEnv(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(`Hiányzó DATABASE_URL környezeti változó. ${DB_ENV_HINT}`);
  }
}

export function getDatabaseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("DATABASE_URL") || message.includes("Environment variable not found")) {
    return `Az adatbázis nincs beállítva. ${DB_ENV_HINT}`;
  }
  if (message.includes("Authentication failed") || message.includes("P1000")) {
    return "Hibás adatbázis jelszó vagy connection string. Másold be pontosan a Supabase Dashboard → Database → Connection string értékét (a jelszó körül NE legyen [ ] zárójel). Ha a jelszó speciális karaktert tartalmaz (@, #, !), URL-kódolás szükséges.";
  }
  if (message.includes("Can't reach database server") || message.includes("P1001")) {
    return "Nem sikerült csatlakozni az adatbázishoz. Ellenőrizd a DATABASE_URL jelszavát és hogy a Supabase projekt fut-e.";
  }
  return message;
}
