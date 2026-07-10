"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/actions/auth";
import { formatAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getEmailRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [resendEmail, setResendEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (error) {
      const decoded = decodeURIComponent(error);
      toast.error(decoded === "{}" || !decoded.trim() ? "Bejelentkezési hiba" : decoded);
    }
  }, [error]);

  function handleResend() {
    if (!resendEmail.trim()) return;
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: resendEmail.trim(),
          options: { emailRedirectTo: getEmailRedirectUrl() },
        });
        if (resendError) toast.error(formatAuthError(resendError));
        else toast.success("Megerősítő e-mail elküldve. Ellenőrizd a postaládádat.");
      } catch (err) {
        toast.error(formatAuthError(err));
      }
    });
  }

  return (
    <>
      <AuthForm
        action={loginAction}
        fields={[
          { name: "email", label: "E-mail", type: "email", placeholder: "email@pelda.hu" },
          { name: "password", label: "Jelszó", type: "password", placeholder: "••••••" },
        ]}
        submitLabel="Bejelentkezés"
      />
      <div className="mt-4 space-y-2 rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Nem kaptál megerősítő e-mailt?</p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="E-mail cím"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            disabled={isPending}
            className="h-8 text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={isPending}>
            Újraküldés
          </Button>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bejelentkezés</CardTitle>
          <CardDescription>Családi Utazástervező</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Betöltés...</p>}>
            <LoginForm />
          </Suspense>
          <div className="mt-4 space-y-2 text-center text-sm">
            <Link href="/auth/forgot-password" className="text-primary hover:underline">
              Elfelejtett jelszó
            </Link>
            <p className="text-muted-foreground">
              Nincs fiókod?{" "}
              <Link href="/auth/register" className="text-primary hover:underline">
                Regisztráció
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
