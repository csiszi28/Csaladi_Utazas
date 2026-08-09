import webpush from "web-push";
import { prisma } from "@csaladi-utazas/database";

export type PushPayload = {
  title: string;
  body: string;
  href?: string;
  tag?: string;
  category?:
    | "reminders"
    | "programs"
    | "accommodations"
    | "transports"
    | "finances"
    | "people"
    | "documents";
};

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

function vapidSubject(): string {
  const raw = process.env.VAPID_SUBJECT?.trim();
  if (raw?.startsWith("mailto:")) return raw;
  if (raw?.includes("@")) return `mailto:${raw}`;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      const host = new URL(site.includes("://") ? site : `https://${site}`).hostname;
      return `mailto:noreply@${host}`;
    } catch {
      /* fall through */
    }
  }
  return "mailto:noreply@localhost";
}

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  return true;
}

function getPushDelegate() {
  return (
    prisma as unknown as {
      pushSubscription?: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            endpoint: string;
            p256dh: string;
            auth: string;
            lastDigestDay: string | null;
          }>
        >;
        upsert: (args: unknown) => Promise<unknown>;
        deleteMany: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
        delete: (args: unknown) => Promise<unknown>;
      };
    }
  ).pushSubscription;
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<boolean> {
  try {
    const delegate = getPushDelegate();
    if (delegate?.upsert) {
      await delegate.upsert({
        where: {
          userId_endpoint: { userId: input.userId, endpoint: input.endpoint },
        },
        create: {
          userId: input.userId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent ?? null,
        },
        update: {
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent ?? null,
        },
      });
      return true;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "push_subscriptions"
        ("id", "userId", "endpoint", "p256dh", "auth", "userAgent", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT ("userId", "endpoint")
       DO UPDATE SET "p256dh" = EXCLUDED."p256dh", "auth" = EXCLUDED."auth",
         "userAgent" = EXCLUDED."userAgent", "updatedAt" = NOW()`,
      input.userId,
      input.endpoint,
      input.p256dh,
      input.auth,
      input.userAgent ?? null
    );
    return true;
  } catch (error) {
    console.error("[savePushSubscription] failed:", error);
    return false;
  }
}

export async function deletePushSubscription(userId: string, endpoint?: string): Promise<void> {
  try {
    const delegate = getPushDelegate();
    if (delegate?.deleteMany) {
      await delegate.deleteMany({
        where: endpoint ? { userId, endpoint } : { userId },
      });
      return;
    }
    if (endpoint) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "push_subscriptions" WHERE "userId" = $1 AND "endpoint" = $2`,
        userId,
        endpoint
      );
    } else {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "push_subscriptions" WHERE "userId" = $1`,
        userId
      );
    }
  } catch (error) {
    console.error("[deletePushSubscription] failed:", error);
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configureWebPush()) return 0;

  // Preferencia-szűrés (főkapcsoló + kategória)
  try {
    const prefDelegate = (
      prisma as unknown as {
        userPushPreference?: {
          findUnique: (args: unknown) => Promise<{
            enabled: boolean;
            categories: string;
          } | null>;
        };
      }
    ).userPushPreference;

    let row: { enabled: boolean; categories: string } | null = null;
    if (prefDelegate?.findUnique) {
      row = await prefDelegate.findUnique({ where: { userId } });
    } else {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "enabled", "categories" FROM "user_push_preferences" WHERE "userId" = $1 LIMIT 1`,
        userId
      )) as Array<{ enabled: boolean; categories: string }>;
      row = rows[0] ?? null;
    }

    if (row) {
      if (!row.enabled) return 0;
      if (payload.category) {
        try {
          const cats = JSON.parse(row.categories) as Record<string, unknown>;
          if (cats[payload.category] === false) return 0;
        } catch {
          /* parse hiba → engedjük */
        }
      }
    }
  } catch {
    /* pref tábla hiányzik → küldjük */
  }

  const delegate = getPushDelegate();
  let subscriptions: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }> = [];

  try {
    if (delegate?.findMany) {
      subscriptions = await delegate.findMany({ where: { userId } });
    } else {
      subscriptions = (await prisma.$queryRawUnsafe(
        `SELECT "id", "endpoint", "p256dh", "auth" FROM "push_subscriptions" WHERE "userId" = $1`,
        userId
      )) as typeof subscriptions;
    }
  } catch (error) {
    console.error("[sendPushToUser] load failed:", error);
    return 0;
  }

  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    href: payload.href ?? "/",
    tag: payload.tag ?? "fam-push",
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "normal" }
        );
        sent += 1;
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;
        if (status === 404 || status === 410) {
          try {
            if (delegate?.delete) {
              await delegate.delete({ where: { id: sub.id } });
            } else {
              await prisma.$executeRawUnsafe(
                `DELETE FROM "push_subscriptions" WHERE "id" = $1`,
                sub.id
              );
            }
          } catch {
            /* ignore */
          }
        } else {
          console.error("[sendPushToUser] send failed:", error);
        }
      }
    })
  );

  return sent;
}

export async function markDigestSent(subscriptionIds: string[], dayKey: string): Promise<void> {
  if (subscriptionIds.length === 0) return;
  try {
    const delegate = getPushDelegate();
    if (delegate?.update) {
      await Promise.all(
        subscriptionIds.map((id) =>
          delegate.update({ where: { id }, data: { lastDigestDay: dayKey } })
        )
      );
      return;
    }
    for (const id of subscriptionIds) {
      await prisma.$executeRawUnsafe(
        `UPDATE "push_subscriptions" SET "lastDigestDay" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        dayKey,
        id
      );
    }
  } catch (error) {
    console.error("[markDigestSent] failed:", error);
  }
}

export async function listUsersWithPushSubscriptions(): Promise<
  Array<{
    userId: string;
    subscriptions: Array<{ id: string; lastDigestDay: string | null }>;
  }>
> {
  try {
    const delegate = getPushDelegate();
    let rows: Array<{ id: string; userId: string; lastDigestDay: string | null }> = [];
    if (delegate?.findMany) {
      rows = await delegate.findMany({
        select: { id: true, userId: true, lastDigestDay: true },
      });
    } else {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT "id", "userId", "lastDigestDay" FROM "push_subscriptions"`
      )) as typeof rows;
    }

    const byUser = new Map<
      string,
      Array<{ id: string; lastDigestDay: string | null }>
    >();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push({ id: row.id, lastDigestDay: row.lastDigestDay });
      byUser.set(row.userId, list);
    }
    return [...byUser.entries()].map(([userId, subscriptions]) => ({
      userId,
      subscriptions,
    }));
  } catch (error) {
    console.error("[listUsersWithPushSubscriptions] failed:", error);
    return [];
  }
}
