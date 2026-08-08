"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/actions/auth";
import { formatAuthError } from "@/lib/auth/errors";
import { ensureAppInteractive } from "@/lib/app-splash";

interface AuthField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
}

interface AuthFormProps {
  action: (formData: FormData) => Promise<ActionResult>;
  fields: AuthField[];
  submitLabel: string;
  redirectOnSuccess?: string;
  successMessage?: string;
}

export function AuthForm({
  action,
  fields,
  submitLabel,
  redirectOnSuccess,
  successMessage,
}: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  function togglePasswordVisibility(fieldName: string) {
    setVisiblePasswords((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result?.success) {
          const message =
            typeof result?.error === "string" && result.error.trim() && result.error !== "{}"
              ? result.error
              : "A művelet sikertelen. Próbáld újra.";
          setError(message);
          toast.error(message);
          return;
        }

        const msg = result.message ?? successMessage;
        if (msg) {
          toast.success(msg);
        }

        ensureAppInteractive();

        const target = result.redirectTo ?? redirectOnSuccess ?? "/";
        router.replace(target);
      } catch (err) {
        const message = formatAuthError(err);
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const isPassword = field.type === "password";
        const showPassword = Boolean(visiblePasswords[field.name]);

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            {isPassword ? (
              <div className="relative">
                <Input
                  id={field.name}
                  name={field.name}
                  type={showPassword ? "text" : "password"}
                  placeholder={field.placeholder}
                  required
                  disabled={isPending}
                  className="pr-10"
                  autoComplete={field.name === "password" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => togglePasswordVisibility(field.name)}
                  disabled={isPending}
                  aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                  title={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            ) : (
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                required
                disabled={isPending}
              />
            )}
          </div>
        );
      })}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Folyamatban..." : submitLabel}
      </Button>
    </form>
  );
}
