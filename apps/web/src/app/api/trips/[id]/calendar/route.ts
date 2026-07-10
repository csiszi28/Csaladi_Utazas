import { NextResponse } from "next/server";
import { prisma } from "@csaladi-utazas/database";
import { buildTripIcal, buildTripIcalFilename } from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";
import { tripAccessFilter } from "@/lib/trip-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId();
  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    select: {
      id: true,
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      programs: {
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          location: true,
          url: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Utazás nem található" }, { status: 404 });
  }

  const ical = buildTripIcal({
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    programs: trip.programs.map((program) => ({
      ...program,
      description: program.location ? `Helyszín: ${program.location}` : null,
    })),
  });

  const filename = buildTripIcalFilename(trip.title);

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
