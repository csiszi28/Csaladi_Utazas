"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth";
import { formatAuthError } from "@/lib/auth/errors";
import { assertDatabaseEnv, getDatabaseErrorMessage } from "@/lib/env";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
} from "@csaladi-utazas/shared";
import {
  getAuthCallbackUrl,
  sendPasswordResetViaResend,
  sendSignupConfirmViaResend,
} from "@/lib/auth-emails";
import { isEmailConfigured } from "@/lib/email";

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string; redirectTo?: string }
  | { success: false; error: string };

async function sendSignupConfirmationEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  name?: string
): Promise<ActionResult> {
  const viaResend = await sendSignupConfirmViaResend({ email, name });
  if (viaResend.ok) {
    return {
      success: true,
      data: undefined,
      message: "Megerősítő e-mail elküldve. Ellenőrizd a postaládádat (spam mappa is).",
      redirectTo: "/auth/login",
    };
  }

  if (!viaResend.fallbackToSupabase && isEmailConfigured()) {
    return { success: false, error: viaResend.error };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getAuthCallbackUrl("/") },
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

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const { name, email, password } = parsed.data;
  const emailRedirectTo = getAuthCallbackUrl("/");

  try {
    const admin = await createServiceClient();

    // Resend útvonal: user létrehozása e-mail küldés nélkül, majd saját szép e-mail
    if (isEmailConfigured()) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { name },
      });

      if (createError) {
        const msg = createError.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          const resent = await sendSignupConfirmationEmail(
            await createClient(),
            email,
            name
          );
          if (!resent.success) return resent;
          return {
            success: true,
            data: undefined,
            message:
              "Ez az e-mail cím már regisztrálva van. Küldtünk egy új megerősítő linket.",
            redirectTo: "/auth/login",
          };
        }
        return { success: false, error: formatAuthError(createError) };
      }

      const sent = await sendSignupConfirmViaResend({
        email,
        name,
        password,
      });

      if (!sent.ok) {
        // Rollback félkész user, ha az e-mail nem ment ki
        if (created.user?.id) {
          await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        }
        return { success: false, error: sent.error };
      }

      return {
        success: true,
        data: undefined,
        message:
          "Regisztráció sikeres! Küldtünk egy megerősítő e-mailt – ellenőrizd a postaládádat.",
        redirectTo: "/auth/login",
      };
    }

    // Nincs Resend: klasszikus Supabase signUp (beépített e-mail)
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo,
      },
    });

    if (error) {
      return { success: false, error: formatAuthError(error) };
    }

    if (data.user?.identities?.length === 0) {
      return sendSignupConfirmationEmail(supabase, email, name);
    }

    if (data.session) {
      try {
        assertDatabaseEnv();
        await syncUser({ ...data.user!, user_metadata: { name } }, { allowEmailAutoLink: true });
      } catch (err) {
        return { success: false, error: getDatabaseErrorMessage(err) };
      }
      revalidatePath("/");
      return {
        success: true,
        data: undefined,
        message: "Regisztráció sikeres! Be vagy jelentkezve.",
        redirectTo: "/",
      };
    }

    return {
      success: true,
      data: undefined,
      message:
        "Regisztráció sikeres! Küldtünk egy megerősítő e-mailt – ellenőrizd a postaládádat.",
      redirectTo: "/auth/login",
    };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
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

/** Auth callback után: session felhasználó szinkronizálása. */
export async function syncUserAfterAuthCallbackAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nincs aktív munkamenet" };
  }

  try {
    assertDatabaseEnv();
    await syncUser(user, { allowEmailAutoLink: true });
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
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        success: false,
        error: "Az e-mail cím még nincs megerősítve. Ellenőrizd a postaládádat és kattints a linkre.",
      };
    }
    return { success: false, error: "Hibás e-mail vagy jelszó" };
  }

  if (data.user) {
    try {
      assertDatabaseEnv();
      await syncUser(data.user, { skipAutoLink: true });
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
  return sendSignupConfirmationEmail(supabase, email);
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const viaResend = await sendPasswordResetViaResend({ email: parsed.data.email });
  if (viaResend.ok) {
    return { success: true, data: undefined };
  }

  if (!viaResend.fallbackToSupabase && isEmailConfigured()) {
    return { success: false, error: viaResend.error };
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
