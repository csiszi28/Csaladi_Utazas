import { prisma } from "@csaladi-utazas/database";
import {
  buildDayItinerary,
  formatDate,
  listTripDays,
} from "@csaladi-utazas/shared";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { resolveTripRole, tripAccessFilter } from "@/lib/trip-access";

export const GET = withApiAuth(async ({ userId, params, request }) => {
  const { id } = await params;
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  const trip = await prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    include: {
      programs: {
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
      transports: {
        select: {
          id: true,
          title: true,
          departureDate: true,
          departureTime: true,
          arrivalDate: true,
          fromLocation: true,
          toLocation: true,
        },
      },
      accommodations: {
        select: {
          id: true,
          title: true,
          checkIn: true,
          checkOut: true,
          location: true,
        },
      },
    },
  });

  if (!trip) return jsonFail("Utazás nem található", 404, "NOT_FOUND");

  const days = listTripDays(trip.startDate, trip.endDate);
  const today = formatDate(new Date());
  const day =
    dateParam && days.includes(dateParam)
      ? dateParam
      : days.includes(today)
        ? today
        : days[0] ?? today;

  const items = buildDayItinerary(day, {
    programs: trip.programs,
    transports: trip.transports,
    accommodations: trip.accommodations,
  });

  const role = await resolveTripRole(id, userId);

  return jsonOk({
    trip: {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
    day,
    days,
    items,
    role,
  });
});
