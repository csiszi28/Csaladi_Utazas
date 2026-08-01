import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth";
import { verifyDocumentAccess } from "@/lib/trip-access";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Returns a short-lived signed URL + original file name.
 * The browser downloads from storage CDN and applies the real fileName locally,
 * avoiding mangled Content-Disposition filenames on redirect.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId();
  const { id } = await params;

  const doc = await verifyDocumentAccess(id, userId);
  if (!doc) {
    return NextResponse.json({ error: "Dokumentum nem található" }, { status: 404 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase.storage
    .from("trip-documents")
    .createSignedUrl(doc.storagePath, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Letöltés sikertelen" }, { status: 500 });
  }

  return NextResponse.json(
    {
      url: data.signedUrl,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
