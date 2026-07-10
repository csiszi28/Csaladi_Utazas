import { NextResponse } from "next/server";
import {
  fetchUrlPreview,
  validatePreviewUrl,
  buildMinimalUrlPreview,
  apiOk,
  apiFail,
} from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";

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
  try {
    await requireAuthUserId();
  } catch {
    return NextResponse.json(apiFail("Hitelesítés szükséges", "UNAUTHORIZED"), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  return resolveUrlPreview(searchParams.get("url"));
}

export async function POST(request: Request) {
  try {
    await requireAuthUserId();
  } catch {
    return NextResponse.json(apiFail("Hitelesítés szükséges", "UNAUTHORIZED"), { status: 401 });
  }

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json(apiFail("Érvénytelen kérés", "INVALID_BODY"), { status: 400 });
  }

  return resolveUrlPreview(body.url ?? null);
}
