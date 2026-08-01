import { prisma } from "@csaladi-utazas/database";
import {
  buildDayItinerary,
  DOCUMENT_CATEGORY_LABELS,
  formatDate,
  listTripDays,
  type DocumentCategory,
} from "@csaladi-utazas/shared";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { resolveTripRole, tripAccessFilter } from "@/lib/trip-access";

const KEY_DOC_CATEGORIES = [
  "PASSPORT",
  "INSURANCE",
  "VOUCHER",
  "TICKET",
  "PROGRAM_TICKET",
  "PROGRAM_BOOKING",
  "PROGRAM_MAP",
  "PROGRAM_INFO",
  "OTHER",
] as const;

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
      packingItems: {
        select: {
          id: true,
          title: true,
          quantity: true,
          isPacked: true,
          assignee: { select: { name: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      },
      documents: {
        where: {
          category: { in: [...KEY_DOC_CATEGORIES] },
        },
        select: {
          id: true,
          fileName: true,
          category: true,
        },
        take: 24,
        orderBy: { uploadedAt: "desc" },
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
    packing: trip.packingItems.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      isPacked: item.isPacked,
      assigneeName: item.assignee?.name ?? null,
    })),
    documents: trip.documents
      .filter((doc) => doc.category !== "PHOTO")
      .map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        category: doc.category,
        categoryLabel:
          DOCUMENT_CATEGORY_LABELS[doc.category as DocumentCategory] ?? doc.category,
        downloadPath: `/api/documents/${doc.id}/download`,
      })),
    role,
  });
});
