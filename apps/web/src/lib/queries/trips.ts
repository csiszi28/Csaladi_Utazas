import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import type { Prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";
import { tripAccessFilter } from "@/lib/trip-access";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";

const listSelect = {
  id: true,
  title: true,
  destination: true,
  startDate: true,
  endDate: true,
  userId: true,
  inviteCode: true,
  participants: {
    select: { familyMember: { select: { id: true, name: true } } },
  },
  _count: { select: { programs: true, costs: true } },
} satisfies Prisma.TripSelect;

export type TripListRow = Prisma.TripGetPayload<{ select: typeof listSelect }>;

const calendarSelect = {
  id: true,
  title: true,
  destination: true,
  startDate: true,
  endDate: true,
  userId: true,
  participants: {
    select: { familyMember: { select: { id: true, name: true } } },
  },
  programs: {
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      url: true,
      participants: {
        select: { familyMember: { select: { id: true, name: true } } },
      },
      costs: {
        select: {
          id: true,
          amount: true,
          currency: true,
          title: true,
          category: true,
          amountScope: true,
        },
      },
    },
    orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }],
  },
  accommodations: {
    select: {
      id: true,
      title: true,
      checkIn: true,
      checkOut: true,
      location: true,
      url: true,
      participants: {
        select: { familyMember: { select: { id: true, name: true } } },
      },
      costs: {
        select: {
          id: true,
          amount: true,
          currency: true,
          title: true,
          category: true,
          amountScope: true,
        },
      },
    },
    orderBy: { checkIn: "asc" as const },
  },
  costs: {
    select: {
      id: true,
      amount: true,
      currency: true,
      title: true,
      programId: true,
      accommodationId: true,
      category: true,
      amountScope: true,
    },
  },
  ideas: {
    select: {
      id: true,
      title: true,
      url: true,
      amount: true,
      currency: true,
      amountScope: true,
      category: true,
      checkInDate: true,
      checkOutDate: true,
      interests: {
        select: { familyMember: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.TripSelect;

export type CalendarTripRow = Prisma.TripGetPayload<{ select: typeof calendarSelect }>;

const tripDetailInclude = {
  participants: { include: { familyMember: true } },
  ideas: {
    include: {
      interests: { include: { familyMember: true } },
      messages: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  accommodations: {
    include: {
      participants: { include: { familyMember: true } },
      costs: true,
    },
    orderBy: { checkIn: "asc" as const },
  },
  programs: {
    include: {
      participants: { include: { familyMember: true } },
      costs: true,
    },
    orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }],
  },
  costs: true,
  documents: true,
} satisfies Prisma.TripInclude;

export type TripDetailRow = NonNullable<
  Prisma.TripGetPayload<{ include: typeof tripDetailInclude }>
>;

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

const getCachedTripsList = (userId: string) =>
  unstable_cache(
    async () =>
      prisma.trip.findMany({
        where: tripAccessFilter(userId),
        select: listSelect,
        orderBy: { startDate: "asc" },
      }),
    [`trips-list-${userId}`],
    { revalidate: 30, tags: [userDataTag(userId)] }
  )();

const getCachedCalendarTrips = (userId: string) =>
  unstable_cache(
    async () =>
      prisma.trip.findMany({
        where: tripAccessFilter(userId),
        select: calendarSelect,
        orderBy: { startDate: "asc" },
      }),
    [`calendar-trips-${userId}`],
    { revalidate: 30, tags: [userDataTag(userId)] }
  )();

export async function fetchTripsList() {
  const userId = await requireAuthUserId();
  return getCachedTripsList(userId);
}

export async function fetchCalendarTrips() {
  const userId = await requireAuthUserId();
  return getCachedCalendarTrips(userId);
}

export async function fetchTripDetail(id: string) {
  const userId = await requireAuthUserId();
  return prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    include: tripDetailInclude,
  });
}
