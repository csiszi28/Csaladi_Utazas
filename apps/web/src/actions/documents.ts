"use server";

import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE = 10 * 1024 * 1024;

import { findAccessibleTrip, verifyDocumentAccess } from "@/lib/trip-access";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import { documentCategorySchema } from "@csaladi-utazas/shared";

function resolveMimeType(file: File): string | null {
  if (file.type && ALLOWED_TYPES.includes(file.type)) {
    return file.type;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return null;
}

export async function uploadDocument(
  formData: FormData
): Promise<
  ActionResult<{
    id: string;
    category: string;
    familyMemberId: string | null;
  }>
> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  const tripId = formData.get("tripId") as string;
  const programId = formData.get("programId") as string | null;
  const categoryRaw = (formData.get("category") as string | null) ?? "OTHER";
  const familyMemberIdRaw = (formData.get("familyMemberId") as string | null) ?? null;
  const categoryParsed = documentCategorySchema.safeParse(categoryRaw);
  const category = categoryParsed.success ? categoryParsed.data : "OTHER";
  const mimeType = file ? resolveMimeType(file) : null;

  if (!file || !tripId) {
    return { success: false, error: "Hiányzó fájl vagy utazás azonosító" };
  }

  if (!mimeType) {
    return { success: false, error: "Csak PDF, PNG és JPEG fájlok engedélyezettek" };
  }

  if (file.size > MAX_SIZE) {
    return { success: false, error: "A fájl mérete maximum 10 MB lehet" };
  }

  const trip = await findAccessibleTrip(tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  let familyMemberId: string | null = null;
  if (familyMemberIdRaw && familyMemberIdRaw !== "__all__") {
    const participant = await prisma.tripParticipant.findFirst({
      where: { tripId, familyMemberId: familyMemberIdRaw },
    });
    if (!participant) {
      return { success: false, error: "A kiválasztott családtag nem résztvevő az utazáson" };
    }
    familyMemberId = familyMemberIdRaw;
  }

  if (programId) {
    const program = await prisma.program.findFirst({
      where: { id: programId, tripId },
    });
    if (!program) {
      return { success: false, error: "Program nem található" };
    }
  }

  const storagePath = `${user.id}/${tripId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const supabase = await createServiceClient();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("trip-documents")
      .upload(storagePath, buffer, { contentType: mimeType });

    if (uploadError) {
      return { success: false, error: "Feltöltési hiba: " + uploadError.message };
    }

    const doc = await prisma.document.create({
      data: {
        tripId,
        programId: programId || null,
        familyMemberId,
        category,
        fileName: file.name,
        storagePath,
        mimeType,
        sizeBytes: file.size,
      },
    });

    invalidateTripsAndReports(user.id, tripId);
    return {
      success: true,
      data: {
        id: doc.id,
        category: doc.category,
        familyMemberId: doc.familyMemberId,
      },
    };
  } catch (error) {
    await supabase.storage.from("trip-documents").remove([storagePath]).catch(() => {});

    const message = error instanceof Error ? error.message : "Ismeretlen hiba";
    if (message.includes("familyMemberId") || message.includes("column")) {
      return {
        success: false,
        error:
          "Az adatbázis még nincs frissítve. Futtasd a migrate-document-family-member.sql fájlt a Supabase-ben.",
      };
    }
    return { success: false, error: "Dokumentum mentési hiba: " + message };
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()]/g, "_");
}

export async function getDocumentSignedUrl(documentId: string): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  const doc = await verifyDocumentAccess(documentId, user.id);

  if (!doc) {
    return { success: false, error: "Dokumentum nem található" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase.storage
    .from("trip-documents")
    .createSignedUrl(doc.storagePath, 3600);

  if (error || !data?.signedUrl) {
    return { success: false, error: "Nem sikerült letöltési linket generálni" };
  }

  return { success: true, data: { url: data.signedUrl } };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const doc = await verifyDocumentAccess(id, user.id);

  if (!doc) {
    return { success: false, error: "Dokumentum nem található" };
  }

  const supabase = await createServiceClient();
  await supabase.storage.from("trip-documents").remove([doc.storagePath]);
  await prisma.document.delete({ where: { id } });

  invalidateTripsAndReports(user.id, doc.tripId);
  return { success: true, data: undefined };
}

export async function getDocuments(tripId: string, programId?: string) {
  const user = await requireUser();
  const trip = await findAccessibleTrip(tripId, user.id);
  if (!trip) return [];

  return prisma.document.findMany({
    where: {
      tripId,
      ...(programId ? { programId } : {}),
    },
    orderBy: { uploadedAt: "desc" },
    include: {
      familyMember: { select: { id: true, name: true } },
    },
  });
}
