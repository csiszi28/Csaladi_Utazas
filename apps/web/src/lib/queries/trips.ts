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
  tripType: true,
  isTemplate: true,
  user: { select: { id: true, name: true, email: true } },
  participants: {
    select: {
      familyMember: { select: { id: true, name: true, linkedUserId: true, userId: true } },
    },
  },
  collaborators: {
    select: { user: { select: { id: true, name: true, email: true } } },
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
  transports: {
    select: {
      id: true,
      type: true,
      title: true,
      departureDate: true,
      departureTime: true,
      arrivalDate: true,
      arrivalTime: true,
      fromLocation: true,
      toLocation: true,
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
    orderBy: [{ departureDate: "asc" as const }, { departureTime: "asc" as const }],
  },
  costs: {
    select: {
      id: true,
      amount: true,
      currency: true,
      title: true,
      programId: true,
      accommodationId: true,
      transportId: true,
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
      date: true,
      startTime: true,
      endTime: true,
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
  user: { select: { id: true, name: true, email: true } },
  participants: { include: { familyMember: true } },
  collaborators: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" as const },
  },
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
  transports: {
    include: {
      participants: { include: { familyMember: true } },
      costs: true,
    },
    orderBy: [{ departureDate: "asc" as const }, { departureTime: "asc" as const }],
  },
  activities: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
  settlementPayments: {
    include: {
      fromMember: { select: { id: true, name: true } },
      toMember: { select: { id: true, name: true } },
    },
    orderBy: { paidAt: "desc" as const },
  },
  packingItems: {
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: "asc" as const }, { title: "asc" as const }],
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
    // Rövid TTL: résztvevőszám / lista ne ragadjon mutáció után
    { revalidate: 1, tags: [userDataTag(userId)] }
  )();

/** Utazások oldal — mindig friss DB (résztvevőszám egyezzen a részletekkel) */
export async function fetchTripsListFresh(userId?: string) {
  const uid = userId ?? (await requireAuthUserId());
  return prisma.trip.findMany({
    where: tripAccessFilter(uid),
    select: listSelect,
    orderBy: { startDate: "asc" },
  });
}

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

const getCachedTripDetail = (userId: string, id: string) =>
  unstable_cache(
    async () =>
      prisma.trip.findFirst({
        where: { id, ...tripAccessFilter(userId) },
        include: {
          ...tripDetailInclude,
          // Saját műveletek nem jelennek meg — azt a felhasználó amúgy is tudja
          activities: {
            where: { actorUserId: { not: userId } },
            include: { actor: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" as const },
            take: 50,
          },
        },
      }),
    [`trip-detail-${userId}-${id}`],
    // Rövid TTL + tag: collaborator élő sync / router.refresh() ne ragadjon 30s-ig
    { revalidate: 1, tags: [userDataTag(userId), `trip-${id}`] }
  )();

/** Élő sync / mutáció után — mindig friss DB, unstable_cache nélkül */
export async function fetchTripDetailFresh(id: string, userId?: string) {
  const uid = userId ?? (await requireAuthUserId());
  return prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(uid) },
    include: {
      ...tripDetailInclude,
      activities: {
        where: { actorUserId: { not: uid } },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" as const },
        take: 50,
      },
    },
  });
}

export async function fetchTripDetail(id: string, userId?: string) {
  const uid = userId ?? (await requireAuthUserId());
  return getCachedTripDetail(uid, id);
}
