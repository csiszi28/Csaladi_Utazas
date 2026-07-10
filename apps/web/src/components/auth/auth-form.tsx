"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/actions/auth";
import { formatAuthError } from "@/lib/auth/errors";

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

export function AuthForm({ action, fields, submitLabel, redirectOnSuccess, successMessage }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        const msg = result.message ?? successMessage ?? "Sikeres művelet";
        toast.success(msg);
        const target = result.redirectTo ?? redirectOnSuccess;
        if (target) {
          router.push(target);
        } else {
          router.push("/");
          router.refresh();
        }
      } catch (err) {
        const message = formatAuthError(err);
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            required
            disabled={isPending}
          />
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Folyamatban..." : submitLabel}
      </Button>
    </form>
  );
}
