import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-prefs";

const categoriesSchema = z.object(
  Object.fromEntries(NOTIFICATION_CATEGORIES.map((k) => [k, z.boolean()])) as Record<
    (typeof NOTIFICATION_CATEGORIES)[number],
    z.ZodBoolean
  >
);

const bodySchema = z.object({
  enabled: z.boolean(),
  categories: categoriesSchema,
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen preferenciák" }, { status: 400 });
    }

    const categoriesJson = JSON.stringify(parsed.data.categories);

    try {
      const delegate = (
        prisma as unknown as {
          userPushPreference?: {
            upsert: (args: unknown) => Promise<unknown>;
          };
        }
      ).userPushPreference;

      if (delegate?.upsert) {
        await delegate.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            enabled: parsed.data.enabled,
            categories: categoriesJson,
          },
          update: {
            enabled: parsed.data.enabled,
            categories: categoriesJson,
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "user_push_preferences" ("userId", "enabled", "categories", "updatedAt")
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT ("userId")
           DO UPDATE SET "enabled" = EXCLUDED."enabled",
             "categories" = EXCLUDED."categories",
             "updatedAt" = NOW()`,
          user.id,
          parsed.data.enabled,
          categoriesJson
        );
      }
    } catch (error) {
      console.error("[push/preferences] save failed:", error);
      return NextResponse.json({ error: "Mentés sikertelen" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nincs bejelentkezés" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    try {
      const delegate = (
        prisma as unknown as {
          userPushPreference?: {
            findUnique: (args: unknown) => Promise<{
              enabled: boolean;
              categories: string;
            } | null>;
          };
        }
      ).userPushPreference;

      if (delegate?.findUnique) {
        const row = await delegate.findUnique({ where: { userId: user.id } });
        if (!row) return NextResponse.json({ enabled: true, categories: null });
        return NextResponse.json({
          enabled: row.enabled,
          categories: JSON.parse(row.categories) as Record<string, boolean>,
        });
      }

      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "enabled", "categories" FROM "user_push_preferences" WHERE "userId" = $1 LIMIT 1`,
        user.id
      )) as Array<{ enabled: boolean; categories: string }>;
      const row = rows[0];
      if (!row) return NextResponse.json({ enabled: true, categories: null });
      return NextResponse.json({
        enabled: row.enabled,
        categories: JSON.parse(row.categories) as Record<string, boolean>,
      });
    } catch {
      return NextResponse.json({ enabled: true, categories: null });
    }
  } catch {
    return NextResponse.json({ error: "Nincs bejelentkezés" }, { status: 401 });
  }
}
