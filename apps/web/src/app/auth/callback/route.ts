import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth";
import { assertDatabaseEnv, getDatabaseErrorMessage } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const message = error.message?.trim() || "A megerősítő link érvénytelen vagy lejárt";
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(message)}`
      );
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
    });
    if (error) {
      const message = error.message?.trim() || "A megerősítő link érvénytelen vagy lejárt";
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(message)}`
      );
    }
  } else {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_token`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      assertDatabaseEnv();
      await syncUser(user, { allowEmailAutoLink: true });
    } catch (err) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(getDatabaseErrorMessage(err))}`
      );
    }
  }

  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
