import { NextResponse } from "next/server";
import { prisma } from "@csaladi-utazas/database";
import { getDatabaseErrorMessage, listMissingEnvVars } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const missingEnv = listMissingEnvVars();
  const status = {
    ok: missingEnv.length === 0,
    missingEnv,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      DIRECT_URL: Boolean(process.env.DIRECT_URL),
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      VERCEL_URL: Boolean(process.env.VERCEL_URL),
    },
    database: null as { ok: boolean; error?: string } | null,
  };

  if (missingEnv.length === 0) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.database = { ok: true };
      status.ok = true;
    } catch (error) {
      status.database = { ok: false, error: getDatabaseErrorMessage(error) };
      status.ok = false;
    }
  }

  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
