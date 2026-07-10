"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth";
import { formatAuthError } from "@/lib/auth/errors";
import { assertDatabaseEnv, getDatabaseErrorMessage, getSiteUrl } from "@/lib/env";
import {
  loginSchema,
  forgotPasswordSchema,
} from "@csaladi-utazas/shared";

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string; redirectTo?: string }
  | { success: false; error: string };

function getAuthCallbackUrl(next = "/") {
  const base = `${getSiteUrl()}/auth/callback`;
  return next === "/" ? base : `${base}?next=${encodeURIComponent(next)}`;
}

async function sendSignupConfirmationEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  emailRedirectTo: string
): Promise<ActionResult> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    return { success: false, error: formatAuthError(error) };
  }

  return {
    success: true,
    data: undefined,
    message: "Megerősítő e-mail elküldve. Ellenőrizd a postaládádat (spam mappa is).",
    redirectTo: "/auth/login",
  };
}

export async function syncUserAfterRegisterAction(name: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nincs aktív munkamenet" };
  }

  try {
    assertDatabaseEnv();
    await syncUser({ ...user, user_metadata: { name } }, { allowEmailAutoLink: true });
  } catch (err) {
    return { success: false, error: getDatabaseErrorMessage(err) };
  }

  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        success: false,
        error: "Az e-mail cím még nincs megerősítve. Ellenőrizd a postaládádat és kattints a linkre.",
      };
    }
    return { success: false, error: "Hibás e-mail vagy jelszó" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      assertDatabaseEnv();
      await syncUser(user);
    } catch (err) {
      return { success: false, error: getDatabaseErrorMessage(err) };
    }
  }

  return { success: true, data: undefined };
}

export async function resendConfirmationEmailAction(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { success: false, error: "Érvénytelen e-mail cím" };
  }

  const supabase = await createClient();
  return sendSignupConfirmationEmail(supabase, email, getAuthCallbackUrl("/"));
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: getAuthCallbackUrl("/auth/reset-password"),
  });

  if (error) {
    return { success: false, error: formatAuthError(error) };
  }

  return { success: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
