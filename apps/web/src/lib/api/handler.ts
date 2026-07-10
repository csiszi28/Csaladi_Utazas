import { NextResponse } from "next/server";
import { apiOk, apiFail } from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";

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
