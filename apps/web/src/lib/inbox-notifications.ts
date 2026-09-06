import { randomUUID } from "node:crypto";
import { prisma } from "@csaladi-utazas/database";

export type InboxNotificationCreateInput = {
  userId: string;
  kind: string;
  title: string;
  body: string;
  href?: string | null;
  tripId?: string | null;
  tripTitle?: string | null;
};

async function sendImmediatePush(
  input: InboxNotificationCreateInput,
  notificationId: string
): Promise<void> {
  try {
    const { sendPushToUser } = await import("@/lib/web-push");
    const { inboxKindToCategory } = await import("@/lib/notification-prefs");
    await sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      href: input.href ?? "/",
      // Egyedi tag: ne olvasson össze több azonos típusú eseményt, és ne írja felül
      tag: `inbox-${notificationId}`,
      category: inboxKindToCategory(input.kind),
    });
  } catch {
    // best-effort
  }
}

/**
 * Best-effort durable inbox write + egyszeri push a rögzítés pillanatában.
 * Never throws — collaborator removal / other mutations must still succeed
 * if the inbox table is missing or the Prisma client is stale.
 */
export async function createInboxNotification(
  input: InboxNotificationCreateInput
): Promise<boolean> {
  try {
    const delegate = (
      prisma as unknown as {
        userInboxNotification?: {
          create: (args: {
            data: Record<string, unknown>;
          }) => Promise<{ id: string }>;
        };
      }
    ).userInboxNotification;

    if (delegate?.create) {
      const row = await delegate.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          href: input.href ?? null,
          tripId: input.tripId ?? null,
          tripTitle: input.tripTitle ?? null,
        },
      });
      void sendImmediatePush(input, row.id);
      return true;
    }

    // Stale Prisma client without the model — try raw insert
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "user_inbox_notifications"
        ("id", "userId", "kind", "title", "body", "href", "tripId", "tripTitle", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      id,
      input.userId,
      input.kind,
      input.title,
      input.body,
      input.href ?? null,
      input.tripId ?? null,
      input.tripTitle ?? null
    );
    void sendImmediatePush(input, id);
    return true;
  } catch (error) {
    console.error("[createInboxNotification] failed:", error);
    return false;
  }
}

export async function listActiveInboxNotifications(userId: string) {
  try {
    const delegate = (
      prisma as unknown as {
        userInboxNotification?: {
          findMany: (args: unknown) => Promise<
            Array<{
              id: string;
              kind: string;
              title: string;
              body: string;
              href: string | null;
              tripId: string | null;
              tripTitle: string | null;
              createdAt: Date;
            }>
          >;
        };
      }
    ).userInboxNotification;

    if (!delegate?.findMany) return [];

    return await delegate.findMany({
      where: { userId, dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (error) {
    console.error("[listActiveInboxNotifications] failed:", error);
    return [];
  }
}

export async function dismissInboxNotification(
  userId: string,
  inboxId: string
): Promise<void> {
  try {
    const delegate = (
      prisma as unknown as {
        userInboxNotification?: {
          updateMany: (args: unknown) => Promise<unknown>;
        };
      }
    ).userInboxNotification;

    if (delegate?.updateMany) {
      await delegate.updateMany({
        where: { id: inboxId, userId, dismissedAt: null },
        data: { dismissedAt: new Date() },
      });
      return;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "user_inbox_notifications"
       SET "dismissedAt" = NOW()
       WHERE "id" = $1 AND "userId" = $2 AND "dismissedAt" IS NULL`,
      inboxId,
      userId
    );
  } catch (error) {
    console.error("[dismissInboxNotification] failed:", error);
  }
}
