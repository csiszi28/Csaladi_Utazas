import { prisma } from "@csaladi-utazas/database";
import { programSchema, parseDate, isDateInRange } from "@csaladi-utazas/shared";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { requireEditableTrip, tripAccessFilter } from "@/lib/trip-access";
import { invalidateTripAudience } from "@/lib/revalidate-app-data";
import { recordTripActivity } from "@/lib/trip-activity";
import { notifyTripAudience } from "@/lib/trip-notifications";

export const GET = withApiAuth(async ({ userId, params }) => {
  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    select: { id: true },
  });
  if (!trip) return jsonFail("Utazás nem található", 404, "NOT_FOUND");

  const programs = await prisma.program.findMany({
    where: { tripId: id },
    include: { participants: { include: { familyMember: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return jsonOk({ programs });
});

export const POST = withApiAuth(async ({ userId, params, request }) => {
  const { id: tripId } = await params;

  const access = await requireEditableTrip(tripId, userId);
  if (!access.ok) return jsonFail(access.error, 403, "FORBIDDEN");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail("Érvénytelen JSON", 400, "INVALID_JSON");
  }

  const parsed = programSchema.safeParse({ ...(body as object), tripId });
  if (!parsed.success) {
    return jsonFail(parsed.error.errors[0]?.message ?? "Érvénytelen adatok", 400, "VALIDATION");
  }

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, access.trip.startDate, access.trip.endDate)) {
    return jsonFail("A program dátuma az utazás időtartamán belül kell legyen", 400, "DATE_RANGE");
  }

  const program = await prisma.program.create({
    data: {
      tripId,
      title: parsed.data.title,
      date: programDate,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      location: parsed.data.location ?? null,
      url: parsed.data.url ?? "",
      ideaId: parsed.data.ideaId ?? null,
      participants: {
        create: parsed.data.participantIds.map((familyMemberId) => ({ familyMemberId })),
      },
    },
  });

  void recordTripActivity({
    tripId,
    actorUserId: userId,
    type: "PROGRAM_CREATED",
    summary: `Új program: ${parsed.data.title}`,
    meta: { programId: program.id },
  });

  void (async () => {
    const actor = await prisma.user.findFirst({
      where: { id: userId },
      select: { name: true },
    });
    await notifyTripAudience({
      tripId,
      actorUserId: userId,
      kind: "program_created",
      title: "Új program",
      body: `${actor?.name ?? "Valaki"}: ${parsed.data.title}`,
      href: `/trips/${tripId}?tab=planning`,
    });
  })();
  invalidateTripAudience(tripId, userId);
  return jsonOk({ program: { id: program.id } }, 201);
});
