function sanitizeDownloadName(fileName: string): string {
  const cleaned = fileName.replace(/[\r\n"/\\?%*:|<>]/g, "_").trim();
  return cleaned || "download";
}

/** Download via CDN signed URL while keeping the original file name. */
export async function downloadDocumentFile(documentId: string): Promise<void> {
  if (typeof document === "undefined") return;
  if (!documentId || documentId.startsWith("temp-")) return;

  const metaRes = await fetch(`/api/documents/${encodeURIComponent(documentId)}/download`, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (!metaRes.ok) {
    let message = "Letöltés sikertelen";
    try {
      const body = (await metaRes.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const meta = (await metaRes.json()) as {
    url: string;
    fileName: string;
    mimeType?: string | null;
  };

  const fileRes = await fetch(meta.url);
  if (!fileRes.ok) {
    throw new Error("Letöltés sikertelen");
  }

  const blob = await fileRes.blob();
  const fileBlob =
    meta.mimeType && blob.type !== meta.mimeType
      ? new Blob([blob], { type: meta.mimeType })
      : blob;

  const objectUrl = URL.createObjectURL(fileBlob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = sanitizeDownloadName(meta.fileName);
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
