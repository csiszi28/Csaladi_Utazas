import { prisma } from "@csaladi-utazas/database";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
] as const;

export type RequiredEnvName = (typeof REQUIRED_ENV)[number];

export function listMissingEnvVars(): RequiredEnvName[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

export function validateAppEnv(): string | null {
  const missing = listMissingEnvVars();
  if (missing.length === 0) return null;

  return (
    `Hiányzó környezeti változók a Vercel-en: ${missing.join(", ")}. ` +
    "Vercel → Project → Settings → Environment Variables → add hozzá mindet (Production + Preview), majd Redeploy."
  );
}

export async function probeDatabase(): Promise<string | null> {
  const envError = validateAppEnv();
  if (envError) return envError;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return null;
  } catch (error) {
    return getDatabaseErrorMessage(error);
  }
}

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
  if (
    message.includes("Authentication failed") ||
    message.includes("P1000") ||
    message.includes("password authentication failed")
  ) {
    return "Hibás adatbázis jelszó vagy connection string. Másold be pontosan a Supabase Dashboard → Database → Connection string értékét (a jelszó körül NE legyen [ ] zárójel). Ha a jelszó speciális karaktert tartalmaz (@, #, !), URL-kódolás szükséges.";
  }
  if (message.includes("Can't reach database server") || message.includes("P1001")) {
    return "Nem sikerült csatlakozni az adatbázishoz. Ellenőrizd a DATABASE_URL jelszavát és hogy a Supabase projekt fut-e.";
  }
  if (message.includes("does not exist") || message.includes("P2022") || message.includes("column")) {
    return (
      "Az adatbázis séma elavult. Futtasd a Supabase SQL Editorban sorrendben: init.sql, rls.sql, " +
      "majd a migrate-*.sql fájlokat (packages/database/prisma/)."
    );
  }
  return message;
}
