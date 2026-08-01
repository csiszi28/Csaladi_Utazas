"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatAuthError } from "@/lib/auth/errors";
import type { ActionResult } from "@/actions/auth";
import { revalidateUserData } from "@/lib/revalidate-user-data";

export async function updateProfileName(name: string): Promise<ActionResult> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { success: false, error: "A név legalább 2 karakter legyen" };
  }
  if (trimmed.length > 80) {
    return { success: false, error: "A név maximum 80 karakter lehet" };
  }

  const supabase = await createClient();
  const { error: metaError } = await supabase.auth.updateUser({
    data: { name: trimmed },
  });
  if (metaError) {
    return { success: false, error: formatAuthError(metaError) };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: trimmed },
  });

  const selfMember = await prisma.familyMember.findFirst({
    where: { userId: user.id, linkedUserId: user.id },
    select: { id: true },
  });
  if (selfMember) {
    await prisma.familyMember.update({
      where: { id: selfMember.id },
      data: { name: trimmed },
    });
  }

  revalidateUserData(user.id);
  revalidatePath("/settings");
  revalidatePath("/family");
  return { success: true, data: undefined };
}

export async function updateAccountPassword(data: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  await requireUser();
  if (data.password.length < 8) {
    return { success: false, error: "A jelszó legalább 8 karakter legyen" };
  }
  if (data.password !== data.confirmPassword) {
    return { success: false, error: "A két jelszó nem egyezik" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: data.password });
  if (error) {
    return { success: false, error: formatAuthError(error) };
  }

  return { success: true, data: undefined, message: "Jelszó frissítve" };
}
