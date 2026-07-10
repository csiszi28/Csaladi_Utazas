"use client";

const CACHE_TTL_MS = 50 * 60 * 1000;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string>>();

export async function getCachedDocumentUrl(
  fetchUrl: (documentId: string) => Promise<{ success: true; data: { url: string } } | { success: false; error: string }>,
  documentId: string
): Promise<string> {
  const cached = signedUrlCache.get(documentId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const pending = inflight.get(documentId);
  if (pending) return pending;

  const promise = fetchUrl(documentId).then((result) => {
    inflight.delete(documentId);
    if (!result.success) throw new Error(result.error);
    signedUrlCache.set(documentId, {
      url: result.data.url,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result.data.url;
  });

  inflight.set(documentId, promise);
  return promise;
}

export function prefetchDocumentUrls(
  fetchUrl: (documentId: string) => Promise<{ success: true; data: { url: string } } | { success: false; error: string }>,
  documentIds: string[]
) {
  queueMicrotask(() => {
    for (const id of documentIds) {
      if (id.startsWith("temp-")) continue;
      getCachedDocumentUrl(fetchUrl, id).catch(() => undefined);
    }
  });
}

export function invalidateDocumentUrl(documentId: string) {
  signedUrlCache.delete(documentId);
  inflight.delete(documentId);
}
