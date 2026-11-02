import { NextResponse } from "next/server";
import {
  fetchUrlPreview,
  validatePreviewUrl,
  buildMinimalUrlPreview,
  apiOk,
  apiFail,
} from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/** Külső oldalakat tölt le a szerver nevében — szigorúbb korlát: 30/perc felhasználónként. */
async function authorize(): Promise<Response | null> {
  let userId: string;
  try {
    userId = await requireAuthUserId();
  } catch {
    return NextResponse.json(apiFail("Hitelesítés szükséges", "UNAUTHORIZED"), { status: 401 });
  }
  const limited = checkRateLimit(`url-preview:${userId}`, 30, 60_000);
  return limited.ok ? null : rateLimitResponse(limited.retryAfterSeconds);
}

async function resolveUrlPreview(url: string | null) {
  if (!url || !validatePreviewUrl(url)) {
    return NextResponse.json(apiFail("Érvénytelen URL", "INVALID_URL"), { status: 400 });
  }

  const preview = (await fetchUrlPreview(url)) ?? buildMinimalUrlPreview(url);
  if (!preview) {
    return NextResponse.json(apiFail("Érvénytelen URL", "INVALID_URL"), { status: 400 });
  }

  return NextResponse.json(apiOk(preview));
}

export async function GET(request: Request) {
  const denied = await authorize();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  return resolveUrlPreview(searchParams.get("url"));
}

export async function POST(request: Request) {
  const denied = await authorize();
  if (denied) return denied;

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json(apiFail("Érvénytelen kérés", "INVALID_BODY"), { status: 400 });
  }

  return resolveUrlPreview(body.url ?? null);
}
