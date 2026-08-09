import { prisma } from "@csaladi-utazas/database";
import { createInboxNotification } from "@/lib/inbox-notifications";
import { getTripAudienceUserIds } from "@/lib/trip-access";

export type TripAudienceNotifyInput = {
  tripId: string;
  actorUserId: string;
  kind: string;
  title: string;
  body: string;
  href?: string | null;
};

/**
 * Inbox + push a többi utazás-tagnak (az actor kihagyva).
 * Best-effort — soha nem dob, a fő művelet ne bukjon el.
 */
export async function notifyTripAudience(input: TripAudienceNotifyInput): Promise<void> {
  try {
    const [memberIds, trip] = await Promise.all([
      getTripAudienceUserIds(input.tripId),
      prisma.trip.findFirst({
        where: { id: input.tripId },
        select: { id: true, title: true },
      }),
    ]);
    if (!trip) return;

    const href = input.href ?? `/trips/${trip.id}`;
    const recipients = memberIds.filter((id) => id !== input.actorUserId);

    await Promise.all(
      recipients.map((userId) =>
        createInboxNotification({
          userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
          href,
          tripId: trip.id,
          tripTitle: trip.title,
        })
      )
    );
  } catch (error) {
    console.error("[notifyTripAudience] failed:", error);
  }
}
