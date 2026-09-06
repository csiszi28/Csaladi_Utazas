"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncUserAfterAuthCallbackAction } from "@/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Auth callback: kezeli a ?code= (PKCE), ?token_hash= és a #access_token= (implicit) linkeket.
 * A régi route handler a hash fragmentet nem látta → hibát mutatott, miközben a megerősítés már megtörtént.
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Megerősítés folyamatban…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const nextRaw = searchParams.get("next") ?? "/";
      const next = nextRaw.startsWith("/") ? nextRaw : "/";
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const token = searchParams.get("token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as
              | "signup"
              | "email"
              | "recovery"
              | "invite"
              | "magiclink"
              | "email_change",
          });
          if (error) throw error;
        } else if (token && type) {
          const email = searchParams.get("email");
          const otpType = type as
            | "signup"
            | "email"
            | "recovery"
            | "invite"
            | "magiclink"
            | "email_change";

          // token + email = OTP; token email nélkül = legacy token_hash
          const { error } = email
            ? await supabase.auth.verifyOtp({ email, token, type: otpType })
            : await supabase.auth.verifyOtp({ token_hash: token, type: otpType });
          if (error) throw error;
        } else if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (!accessToken || !refreshToken) {
            throw new Error("A megerősítő link érvénytelen vagy lejárt");
          }
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          // Hash törlése a címsorból
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) {
            throw new Error("A megerősítő link érvénytelen vagy lejárt");
          }
        }

        if (cancelled) return;
        setStatus("Fiók szinkronizálása…");
        const sync = await syncUserAfterAuthCallbackAction();
        if (!sync.success) {
          // Session megvan — ne blokkoljuk a belépést DB sync hibán
          console.error("[auth/callback] sync failed:", sync.error);
        }

        if (cancelled) return;
        setStatus("Kész, átirányítás…");
        router.replace(next);
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message.trim()
            ? err.message
            : "A megerősítő link érvénytelen vagy lejárt";
        router.replace(`/auth/login?error=${encodeURIComponent(message)}`);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <Card className="w-full border-white/20 bg-card/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Majdnem kész</CardTitle>
        <CardDescription>{status}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center py-4">
          <div className="h-8 w-8 animate-spin rounded-md border-2 border-primary border-t-transparent" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full border-white/20 bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Betöltés…</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
