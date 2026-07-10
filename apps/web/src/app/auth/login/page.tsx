"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      const decoded = decodeURIComponent(error);
      toast.error(decoded === "{}" || !decoded.trim() ? "Bejelentkezési hiba" : decoded);
    }
  }, [error]);

  return (
    <AuthForm
      action={loginAction}
      fields={[
        { name: "email", label: "E-mail", type: "email", placeholder: "email@pelda.hu" },
        { name: "password", label: "Jelszó", type: "password", placeholder: "••••••" },
      ]}
      submitLabel="Bejelentkezés"
    />
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
