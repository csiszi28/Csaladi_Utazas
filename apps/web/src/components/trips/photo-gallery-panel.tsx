"use client";

import { useRef, useState, useTransition, useEffect, useMemo } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@csaladi-utazas/shared";
import { uploadDocument, deleteDocument, getDocumentSignedUrl } from "@/actions/documents";
import { getCachedDocumentUrl } from "@/lib/document-url-cache";
import { PhotoLightbox, type PhotoLightboxItem } from "@/components/photos/photo-lightbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LocationAutocomplete } from "@/components/trips/location-autocomplete";
import type { DocumentItem } from "@/components/documents/document-upload";

interface PhotoGalleryPanelProps {
  tripId: string;
  documents: DocumentItem[];
  canEdit?: boolean;
  onDocumentUploaded: (doc: DocumentItem) => void;
  onDocumentDeleted: (id: string) => void;
}

type GroupMode = "day" | "location";

function groupKeyForDay(doc: DocumentItem): string {
  const date = doc.takenAt ?? doc.uploadedAt;
  return date ? formatDate(date) : "Ismeretlen dátum";
}

function groupKeyForLocation(doc: DocumentItem): string {
  return doc.locationLabel?.trim() || "Ismeretlen hely";
}

export function PhotoGalleryPanel({
  tripId,
  documents,
  canEdit = true,
  onDocumentUploaded,
  onDocumentDeleted,
}: PhotoGalleryPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("day");
  const [uploadLocation, setUploadLocation] = useState("");

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

  useEffect(() => {
    if (lightboxIndex == null) return;
    if (documents.length === 0) {
      setLightboxIndex(null);
      return;
    }
    if (lightboxIndex >= documents.length) {
      setLightboxIndex(documents.length - 1);
    }
  }, [documents, lightboxIndex]);

  const groups = useMemo(() => {
    const keyFn = groupMode === "day" ? groupKeyForDay : groupKeyForLocation;
    const map = new Map<string, DocumentItem[]>();
    for (const doc of documents) {
      const key = keyFn(doc);
      const list = map.get(key) ?? [];
      list.push(doc);
      map.set(key, list);
    }
    const entries = [...map.entries()];
    entries.sort((a, b) => {
      if (a[0] === "Ismeretlen dátum" || a[0] === "Ismeretlen hely") return 1;
      if (b[0] === "Ismeretlen dátum" || b[0] === "Ismeretlen hely") return -1;
      return groupMode === "day" ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]);
    });
    return entries;
  }, [documents, groupMode]);

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
        if (uploadLocation.trim()) fd.set("locationLabel", uploadLocation.trim());
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
          takenAt: result.data.takenAt,
          locationLabel: result.data.locationLabel,
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

  const lightboxItems: PhotoLightboxItem[] = documents.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    url: urls[doc.id],
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{documents.length} fotó</p>
        <div className="flex items-center gap-2">
          <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Nap</SelectItem>
              <SelectItem value="location">Hely</SelectItem>
            </SelectContent>
          </Select>
          {canEdit ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <LocationAutocomplete
          value={uploadLocation}
          onChange={setUploadLocation}
          placeholder="Helyszín a következő feltöltéshez (opcionális)"
        />
      ) : null}

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Még nincsenek fotók. Tölts fel emlékképeket az utazásról.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(([groupLabel, docs]) => (
            <div key={groupLabel} className="space-y-2">
              <div className="sticky top-0 z-[1] -mx-1 bg-background/95 px-1 py-1.5 text-sm font-semibold backdrop-blur">
                {groupLabel}
                <span className="ml-1.5 font-normal text-muted-foreground">({docs.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {docs.map((doc) => {
                  const index = documents.findIndex((d) => d.id === doc.id);
                  return (
                    <div
                      key={doc.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {urls[doc.id] ? (
                        <button
                          type="button"
                          className="h-full w-full"
                          onClick={() => setLightboxIndex(index)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={urls[doc.id]}
                            alt={doc.fileName}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                          …
                        </div>
                      )}
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                          disabled={pending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <PhotoLightbox
        items={lightboxItems}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
