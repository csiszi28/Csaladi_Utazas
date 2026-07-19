export type ReminderKind =
  | "checklist_missing"
  | "tomorrow_program"
  | "tomorrow_transport"
  | "open_settlement";

export interface AppReminder {
  key: string;
  kind: ReminderKind;
  tripId: string;
  tripTitle: string;
  title: string;
  body: string;
  dueAt: string;
  href: string;
}

export interface ReminderTripInput {
  id: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  missingChecklistCount?: number;
  tomorrowProgramTitles?: string[];
  tomorrowTransportTitles?: string[];
  openSettlementTransferCount?: number;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

function asDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Builds in-app reminders from trip snapshots. Pure — no I/O.
 */
export function buildReminders(
  trips: ReminderTripInput[],
  dismissedKeys: ReadonlySet<string> | string[],
  now: Date = new Date()
): AppReminder[] {
  const dismissed =
    dismissedKeys instanceof Set ? dismissedKeys : new Set(dismissedKeys);
  const reminders: AppReminder[] = [];
  const today = startOfDay(now);

  for (const trip of trips) {
    const start = asDate(trip.startDate);
    const end = asDate(trip.endDate);
    const daysUntilStart = daysBetween(start, today);
    const daysAfterEnd = daysBetween(today, end);

    if (
      trip.missingChecklistCount &&
      trip.missingChecklistCount > 0 &&
      [7, 3, 1].includes(daysUntilStart)
    ) {
      const key = `checklist:${trip.id}:${daysUntilStart}`;
      if (!dismissed.has(key)) {
        reminders.push({
          key,
          kind: "checklist_missing",
          tripId: trip.id,
          tripTitle: trip.title,
          title: "Hiányzó dokumentumok",
          body: `${trip.title}: ${trip.missingChecklistCount} checklista elem hiányzik (${daysUntilStart} nap az indulásig).`,
          dueAt: start.toISOString(),
          href: `/trips/${trip.id}?tab=documents`,
        });
      }
    }

    if (trip.tomorrowProgramTitles && trip.tomorrowProgramTitles.length > 0) {
      const key = `tomorrow-program:${trip.id}:${today.toISOString().slice(0, 10)}`;
      if (!dismissed.has(key)) {
        reminders.push({
          key,
          kind: "tomorrow_program",
          tripId: trip.id,
          tripTitle: trip.title,
          title: "Holnapi programok",
          body: `${trip.title}: ${trip.tomorrowProgramTitles.slice(0, 3).join(", ")}`,
          dueAt: today.toISOString(),
          href: `/trips/${trip.id}?tab=planning`,
        });
      }
    }

    if (trip.tomorrowTransportTitles && trip.tomorrowTransportTitles.length > 0) {
      const key = `tomorrow-transport:${trip.id}:${today.toISOString().slice(0, 10)}`;
      if (!dismissed.has(key)) {
        reminders.push({
          key,
          kind: "tomorrow_transport",
          tripId: trip.id,
          tripTitle: trip.title,
          title: "Holnapi közlekedés",
          body: `${trip.title}: ${trip.tomorrowTransportTitles.slice(0, 3).join(", ")}`,
          dueAt: today.toISOString(),
          href: `/trips/${trip.id}?tab=transport`,
        });
      }
    }

    if (
      trip.openSettlementTransferCount &&
      trip.openSettlementTransferCount > 0 &&
      daysAfterEnd >= 0 &&
      daysAfterEnd <= 30
    ) {
      const key = `settlement:${trip.id}`;
      if (!dismissed.has(key)) {
        reminders.push({
          key,
          kind: "open_settlement",
          tripId: trip.id,
          tripTitle: trip.title,
          title: "Nyitott elszámolás",
          body: `${trip.title}: ${trip.openSettlementTransferCount} átutalás még nyitott.`,
          dueAt: end.toISOString(),
          href: `/trips/${trip.id}?tab=finances`,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
