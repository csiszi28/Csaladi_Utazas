import { NextResponse } from "next/server";
import { apiOk, apiFail } from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

/** Alap korlát: felhasználónként és útvonalanként percenként. */
const API_LIMIT_PER_MINUTE = 120;

export type ApiHandlerContext = {
  userId: string;
  params: Promise<Record<string, string>>;
  request: Request;
};

export function withApiAuth(
  handler: (ctx: ApiHandlerContext) => Promise<NextResponse>
) {
  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    try {
      const userId = await requireAuthUserId();

      const path = new URL(request.url).pathname;
      const limited = checkRateLimit(`api:${userId}:${path}`, API_LIMIT_PER_MINUTE, 60_000);
      if (!limited.ok) {
        return NextResponse.json(apiFail("Túl sok kérés. Próbáld újra később.", "RATE_LIMITED"), {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSeconds) },
        });
      }

      return await handler({ userId, params: context.params, request });
    } catch {
      return NextResponse.json(apiFail("Hitelesítés szükséges", "UNAUTHORIZED"), { status: 401 });
    }
  };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(apiOk(data), { status });
}

export function jsonFail(error: string, status = 400, code?: string) {
  return NextResponse.json(apiFail(error, code), { status });
}
