"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

async function persistAvatarFields(
  userId: string,
  avatarStoragePath: string | null,
  avatarMimeType: string | null
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "avatarStoragePath" = $1, "avatarMimeType" = $2 WHERE "id" = $3`,
    avatarStoragePath,
    avatarMimeType,
    userId
  );
}

async function readAvatarPath(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ avatarStoragePath: string | null }>>(
      `SELECT "avatarStoragePath" FROM "users" WHERE "id" = $1 LIMIT 1`,
      userId
    );
    return rows[0]?.avatarStoragePath ?? null;
  } catch {
    return null;
  }
}

export async function uploadProfileAvatar(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false, error: "Hiányzó képfájl" };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Csak képfájl tölthető fel" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "A kép maximum 5 MB lehet" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const storagePath = `${user.id}/avatar-${Date.now()}.${safeExt}`;
  const supabase = await createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("trip-documents").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    return { success: false, error: error.message };
  }

  const previousPath = await readAvatarPath(user.id);
  if (previousPath && previousPath !== storagePath) {
    void supabase.storage.from("trip-documents").remove([previousPath]).catch(() => undefined);
  }

  await persistAvatarFields(user.id, storagePath, file.type);

  const sessionClient = await createClient();
  await sessionClient.auth.updateUser({
    data: { avatar_path: storagePath },
  });

  revalidateUserData(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function removeProfileAvatar(): Promise<ActionResult> {
  const user = await requireUser();
  const previousPath = await readAvatarPath(user.id);

  if (previousPath) {
    const supabase = await createServiceClient();
    void supabase.storage.from("trip-documents").remove([previousPath]).catch(() => undefined);
  }

  await persistAvatarFields(user.id, null, null);

  const sessionClient = await createClient();
  await sessionClient.auth.updateUser({
    data: { avatar_path: null },
  });

  revalidateUserData(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true, data: undefined };
}

export async function updateAccountPassword(data: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  await requireUser();
  if (!data.password) {
    return { success: false, error: "Add meg az új jelszót" };
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

export async function deleteAccount(
  confirmation: string
): Promise<ActionResult<{ redirectTo: string }>> {
  const user = await requireUser();
  if (confirmation.trim().toUpperCase() !== "TORLES") {
    return {
      success: false,
      error: "A megerősítéshez írd be: TORLES",
    };
  }

  const ownedTrips = await prisma.trip.count({ where: { userId: user.id } });
  if (ownedTrips > 0) {
    return {
      success: false,
      error:
        "Előbb töröld vagy add át a saját tulajdonú utazásaidat (vagy töröld őket), mielőtt a fiókot törölnéd.",
    };
  }

  const admin = await createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    };
  }

  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);

  const sessionClient = await createClient();
  await sessionClient.auth.signOut();

  return { success: true, data: { redirectTo: "/auth/login" } };
}
