import { NextResponse } from "next/server";
import { prisma } from "@csaladi-utazas/database";
import {
  buildReminders,
  buildTripSettlement,
  applySettlementPayments,
  DEFAULT_HUF_RATES,
  mapInboxNotificationsToReminders,
} from "@csaladi-utazas/shared";
import { tripAccessFilter } from "@/lib/trip-access";
import { listActiveInboxNotifications } from "@/lib/inbox-notifications";
import {
  isWebPushConfigured,
  listUsersWithPushSubscriptions,
  markDigestSent,
  sendPushToUser,
} from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Ugyanaz a logika, mint getUserReminders — cronhoz userId alapján. */
async function remindersForUser(userId: string) {
  const [trips, dismissals, inbox] = await Promise.all([
    prisma.trip.findMany({
      where: tripAccessFilter(userId),
      include: {
        participants: { include: { familyMember: true } },
        programs: {
          select: {
            id: true,
            title: true,
            date: true,
            participants: { select: { familyMemberId: true } },
          },
        },
        transports: {
          select: {
            id: true,
            title: true,
            departureDate: true,
            participants: { select: { familyMemberId: true } },
          },
        },
        accommodations: {
          select: { id: true, participants: { select: { familyMemberId: true } } },
        },
        costs: true,
        documents: { select: { category: true, familyMemberId: true, programId: true } },
        settlementPayments: true,
        ideas: {
          select: { id: true, title: true, voteDeadline: true, decision: true },
        },
      },
    }),
    prisma.userNotificationDismissal.findMany({
      where: { userId },
      select: { reminderKey: true },
    }),
    listActiveInboxNotifications(userId),
  ]);

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  const rates = DEFAULT_HUF_RATES;

  const inputs = trips.map((trip) => {
    const missingChecklist = ["PASSPORT", "INSURANCE", "VOUCHER"].filter((cat) => {
      return !trip.documents.some((d) => d.category === cat && !d.programId);
    }).length;

    const tomorrowPrograms = trip.programs
      .filter((p) => new Date(p.date).toISOString().slice(0, 10) === tomorrowKey)
      .map((p) => p.title);

    const tomorrowTransports = trip.transports
      .filter((t) => new Date(t.departureDate).toISOString().slice(0, 10) === tomorrowKey)
      .map((t) => t.title);

    const settlement = buildTripSettlement(
      {
        participants: trip.participants.map((p) => ({
          id: p.familyMember.id,
          name: p.familyMember.name,
        })),
        programs: trip.programs.map((p) => ({
          id: p.id,
          participantIds: p.participants.map((x) => x.familyMemberId),
        })),
        accommodations: trip.accommodations.map((a) => ({
          id: a.id,
          participantIds: a.participants.map((x) => x.familyMemberId),
        })),
        transports: trip.transports.map((t) => ({
          id: t.id,
          participantIds: t.participants.map((x) => x.familyMemberId),
        })),
        costs: trip.costs,
      },
      rates
    );

    const remaining = applySettlementPayments(
      settlement.transfers,
      trip.settlementPayments.map((p) => ({
        fromFamilyMemberId: p.fromFamilyMemberId,
        toFamilyMemberId: p.toFamilyMemberId,
        amountHuf: p.amountHuf,
      }))
    );

    return {
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      missingChecklistCount: missingChecklist,
      tomorrowProgramTitles: tomorrowPrograms,
      tomorrowTransportTitles: tomorrowTransports,
      openSettlementTransferCount: remaining.length,
      ideaDeadlines: trip.ideas
        .filter((i) => i.voteDeadline && (i.decision ?? "OPEN") === "OPEN")
        .map((i) => ({
          ideaId: i.id,
          ideaTitle: i.title,
          voteDeadline: i.voteDeadline!,
        })),
    };
  });

  const computed = buildReminders(
    inputs,
    dismissals.map((d) => d.reminderKey)
  );
  const inboxReminders = mapInboxNotificationsToReminders(inbox);

  return [...inboxReminders, ...computed].sort((a, b) => b.dueAt.localeCompare(a.dueAt));
}

/** Napi emlékeztető digest push — Vercel Cron. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWebPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: "web-push-not-configured" });
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const users = await listUsersWithPushSubscriptions();
  let sentUsers = 0;

  for (const { userId, subscriptions } of users) {
    const needsDigest = subscriptions.some((s) => s.lastDigestDay !== dayKey);
    if (!needsDigest) continue;

    try {
      const reminders = await remindersForUser(userId);
      if (reminders.length === 0) {
        await markDigestSent(
          subscriptions.map((s) => s.id),
          dayKey
        );
        continue;
      }

      const first = reminders[0]!;
      const title =
        reminders.length === 1 ? first.title : `${reminders.length} emlékeztető`;
      const body =
        reminders.length === 1
          ? first.body
          : reminders
              .slice(0, 3)
              .map((r) => r.title)
              .join(" · ");

      const sent = await sendPushToUser(userId, {
        title,
        body,
        href: first.href,
        tag: `digest-${dayKey}`,
        category: "reminders",
      });

      if (sent > 0) {
        sentUsers += 1;
        await markDigestSent(
          subscriptions.map((s) => s.id),
          dayKey
        );
      }
    } catch (error) {
      console.error("[cron/push-reminders] user failed:", userId, error);
    }
  }

  return NextResponse.json({
    ok: true,
    dayKey,
    users: users.length,
    sentUsers,
  });
}
