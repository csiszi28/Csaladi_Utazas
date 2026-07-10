"use client";

import { useEffect, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDocumentSignedUrl } from "@/actions/documents";
import { getCachedDocumentUrl, prefetchDocumentUrls } from "@/lib/document-url-cache";
import type { DocumentItem } from "@/components/documents/document-upload";

interface DocumentViewerProps {
  documents: DocumentItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDocumentId?: string;
}

async function fetchSignedUrl(documentId: string) {
  return getDocumentSignedUrl(documentId);
}

export function DocumentViewer({
  documents,
  open,
  onOpenChange,
  initialDocumentId,
}: DocumentViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = documents.find((d) => d.id === selectedId);

  useEffect(() => {
    if (documents.length > 0) {
      prefetchDocumentUrls(fetchSignedUrl, documents.map((d) => d.id));
    }
  }, [documents]);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    const initial = initialDocumentId ?? documents[0]?.id ?? null;
    setSelectedId(initial);
  }, [open, initialDocumentId, documents]);

  useEffect(() => {
    if (!open || !selectedId) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    setError(null);
    setPreviewUrl(null);
    setLoading(true);

    getCachedDocumentUrl(fetchSignedUrl, selectedId)
      .then((url) => {
        if (cancelled) return;
        setPreviewUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : "Betöltési hiba");
        setPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedId]);

  if (documents.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
          "[body[data-dashboard-layout=true]_&]:w-[calc(100vw-18rem)]",
          "[body[data-dashboard-layout=true]_&]:max-w-[calc(100vw-18rem)]"
        )}
      >
        <DialogHeader className="shrink-0 px-4 py-3 sm:px-5 sm:py-4">
          <DialogTitle>Dokumentum megtekintése</DialogTitle>
          {selected && (
            <p className="truncate text-sm font-normal text-muted-foreground">{selected.fileName}</p>
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden border-t px-4 pb-4 pt-3 sm:gap-4 sm:px-5 sm:pb-5 sm:pt-4 lg:flex-row">
          <div className="flex max-h-28 shrink-0 flex-col gap-1.5 lg:max-h-none lg:w-52 lg:shrink-0">
            <p className="text-xs font-medium text-muted-foreground">Válassz dokumentumot</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border p-1">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedId(doc.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    selectedId === doc.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="line-clamp-2 break-all">{doc.fileName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/20">
            {!selected && (
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
                Válassz egy dokumentumot a listából
              </div>
            )}
            {selected && loading && !previewUrl && (
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
                Betöltés…
              </div>
            )}
            {selected && error && (
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {selected && previewUrl && (
              <>
                {selected.mimeType.startsWith("image/") ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={selected.fileName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <iframe
                    src={previewUrl}
                    title={selected.fileName}
                    className="min-h-0 flex-1 border-0"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentViewerTrigger({
  documents,
  className,
}: {
  documents: DocumentItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (documents.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Eye className="mr-2 h-4 w-4" />
        Megtekintés ({documents.length})
      </Button>
      <DocumentViewer documents={documents} open={open} onOpenChange={setOpen} />
    </>
  );
}
