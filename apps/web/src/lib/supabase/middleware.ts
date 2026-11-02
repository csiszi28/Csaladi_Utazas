import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateAppEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const envError = validateAppEnv();
  if (envError) {
    if (request.nextUrl.pathname === "/api/health") {
      return NextResponse.next({ request });
    }
    return new NextResponse(envError, { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims: a JWT-t helyben ellenőrzi (aszimmetrikus kulcsnál nincs hálózati hívás),
  // szemben a getUser()-rel, ami minden kérésnél a Supabase auth szerverhez fordul.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  // A cron végpontok saját CRON_SECRET-tel védettek (Vercel Cron nem hordoz süti-munkamenetet).
  const isPublicApi = pathname === "/api/health" || pathname.startsWith("/api/cron/");
  const authRoutesWithSession = ["/auth/callback", "/auth/reset-password"];
  const allowsLoggedInUser = authRoutesWithSession.some((r) => pathname.startsWith(r));

  if (!user && !isAuthRoute && !isPublicApi) {
    // API-kliensnek (fetch) JSON 401 jár, nem a bejelentkezési oldal HTML-je.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Hitelesítés szükséges", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && !allowsLoggedInUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
