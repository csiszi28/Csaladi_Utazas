import { prisma } from "@csaladi-utazas/database";
import { programSchema, parseDate, isDateInRange } from "@csaladi-utazas/shared";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { requireTripEditor, tripAccessFilter } from "@/lib/trip-access";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import { recordTripActivity } from "@/lib/trip-activity";

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

  const access = await requireTripEditor(tripId, userId);
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

  const trip = await prisma.trip.findFirst({
    where: { id: tripId },
    select: { startDate: true, endDate: true },
  });
  if (!trip) return jsonFail("Utazás nem található", 404, "NOT_FOUND");

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, trip.startDate, trip.endDate)) {
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

  await recordTripActivity({
    tripId,
    actorUserId: userId,
    type: "PROGRAM_CREATED",
    summary: `Új program: ${parsed.data.title}`,
    meta: { programId: program.id },
  });

  invalidateTripsAndReports(userId, tripId);
  return jsonOk({ program: { id: program.id } }, 201);
});
