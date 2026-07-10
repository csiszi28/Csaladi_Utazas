"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerSchema } from "@csaladi-utazas/shared";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth/errors";
import { syncUserAfterRegisterAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getEmailRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Érvénytelen adatok";
      setError(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const emailRedirectTo = getEmailRedirectUrl();

      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { name: parsed.data.name },
            emailRedirectTo,
          },
        });

        if (signUpError) {
          const msg = formatAuthError(signUpError);
          setError(msg);
          toast.error(msg);
          return;
        }

        if (data.user?.identities?.length === 0) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: parsed.data.email,
            options: { emailRedirectTo },
          });

          if (resendError) {
            const msg = formatAuthError(resendError);
            setError(msg);
            toast.error(msg);
            return;
          }

          toast.success(
            "Ez az e-mail cím már regisztrálva van. Küldtünk egy új megerősítő linket."
          );
          router.push("/auth/login");
          return;
        }

        if (data.session) {
          const result = await syncUserAfterRegisterAction(parsed.data.name);
          if (!result.success) {
            const msg =
              typeof result.error === "string" ? result.error : "Adatbázis szinkron hiba";
            setError(msg);
            toast.error(msg);
            return;
          }
          toast.success("Regisztráció sikeres! Be vagy jelentkezve.");
          router.push("/");
          router.refresh();
          return;
        }

        toast.success(
          "Regisztráció sikeres! Küldtünk egy megerősítő e-mailt – ellenőrizd a postaládádat."
        );
        router.push("/auth/login");
      } catch (err) {
        const msg = formatAuthError(err);
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" type="text" placeholder="Teljes név" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" placeholder="email@pelda.hu" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Jelszó</Label>
        <Input id="password" name="password" type="password" placeholder="Min. 6 karakter" required disabled={isPending} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Folyamatban..." : "Regisztráció"}
      </Button>
    </form>
  );
}
