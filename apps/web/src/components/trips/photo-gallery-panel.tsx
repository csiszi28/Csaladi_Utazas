"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocument, deleteDocument, getDocumentSignedUrl } from "@/actions/documents";
import { getCachedDocumentUrl } from "@/lib/document-url-cache";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { DocumentItem } from "@/components/documents/document-upload";

interface PhotoGalleryPanelProps {
  tripId: string;
  documents: DocumentItem[];
  onDocumentUploaded: (doc: DocumentItem) => void;
  onDocumentDeleted: (id: string) => void;
}

export function PhotoGalleryPanel({
  tripId,
  documents,
  onDocumentUploaded,
  onDocumentDeleted,
}: PhotoGalleryPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: Record<string, string> = {};
      await Promise.all(
        documents.map(async (doc) => {
          try {
            const url = await getCachedDocumentUrl(getDocumentSignedUrl, doc.id);
            next[doc.id] = url;
          } catch {
            // ignore
          }
        })
      );
      if (!cancelled) setUrls(next);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [documents]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    startTransition(async () => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: csak képfájl engedélyezett`);
          continue;
        }
        const fd = new FormData();
        fd.set("tripId", tripId);
        fd.set("category", "PHOTO");
        fd.set("file", file);
        const result = await uploadDocument(fd);
        if (!result.success) {
          toast.error(result.error);
          continue;
        }
        onDocumentUploaded({
          id: result.data.id,
          fileName: file.name,
          category: "PHOTO",
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date(),
          programId: null,
          familyMemberId: result.data.familyMemberId,
        } as DocumentItem);
      }
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDocument(id);
      if (!result.success) toast.error(result.error);
      else {
        onDocumentDeleted(id);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{documents.length} fotó</p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            className="min-h-[var(--touch-target)]"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Feltöltés
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Még nincsenek fotók. Tölts fel emlékképeket az utazásról.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
            >
              {urls[doc.id] ? (
                <button
                  type="button"
                  className="h-full w-full"
                  onClick={() => setLightbox(urls[doc.id] ?? null)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls[doc.id]}
                    alt={doc.fileName}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Betöltés…
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                disabled={pending}
                onClick={() => handleDelete(doc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      ) : null}
    </div>
  );
}
