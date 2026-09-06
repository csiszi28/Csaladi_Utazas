import { NextResponse } from "next/server";
import { isWebPushConfigured } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Korábban napi digest / emlékeztető újraküldés.
 * Kikapcsolva: push csak esemény rögzítésekor megy (createInboxNotification).
 * Az in-app emlékeztető csengő továbbra is a getUserReminders-t használja.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    skipped: "event-driven-push-only",
    webPushConfigured: isWebPushConfigured(),
  });
}
