"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, FileText, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function DocumentPreview({
  selected,
  previewUrl,
  loading,
  error,
}: {
  selected: DocumentItem | undefined;
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
}) {
  if (!selected) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Válassz egy dokumentumot a listából
      </div>
    );
  }

  if (loading && !previewUrl) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Betöltés…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!previewUrl) return null;

  if (selected.mimeType.startsWith("image/")) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={selected.fileName}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <iframe
      src={previewUrl}
      title={selected.fileName}
      className="min-h-0 flex-1 border-0 bg-white"
    />
  );
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
  const [immersive, setImmersive] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const selected = documents.find((d) => d.id === selectedId);
  const selectedIndex = selectedId
    ? documents.findIndex((d) => d.id === selectedId)
    : -1;
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < documents.length - 1;
  const canPreview = Boolean(selected && previewUrl && !error);

  function selectByIndex(index: number) {
    const doc = documents[index];
    if (doc) setSelectedId(doc.id);
  }

  function goPrev() {
    if (canGoPrev) selectByIndex(selectedIndex - 1);
  }

  function goNext() {
    if (canGoNext) selectByIndex(selectedIndex + 1);
  }

  function stepDocument(direction: -1 | 1) {
    setSelectedId((currentId) => {
      const index = documents.findIndex((d) => d.id === currentId);
      if (index < 0) return currentId;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= documents.length) return currentId;
      return documents[nextIndex]?.id ?? currentId;
    });
  }

  useEffect(() => {
    if (documents.length > 0) {
      prefetchDocumentUrls(fetchSignedUrl, documents.map((d) => d.id));
    }
  }, [documents]);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setError(null);
      setImmersive(false);
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

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape" && immersive) {
        event.preventDefault();
        setImmersive(false);
        return;
      }

      // Lista logika: fel/balra = előző, le/jobbra = következő
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        stepDocument(-1);
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        stepDocument(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, immersive, documents]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 56) return;

    if (deltaX < 0) goNext();
    else goPrev();
  }

  if (documents.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0",
          "fixed inset-0 left-0 top-0 h-[100svh] max-h-[100svh] translate-x-0 translate-y-0",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          !immersive &&
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)] sm:w-[calc(100vw-1.5rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:pt-0 sm:pb-0 md:[body[data-dashboard-layout=true]_&]:w-[calc(100vw-18rem)] md:[body[data-dashboard-layout=true]_&]:max-w-[calc(100vw-18rem)]",
          "[&>button]:hidden",
          immersive &&
            "!fixed !inset-0 !left-0 !top-0 !right-0 !bottom-0 !z-[70] !h-[100svh] !max-h-[100svh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 bg-black md:[body[data-dashboard-layout=true]_&]:!left-0 md:[body[data-dashboard-layout=true]_&]:!w-screen md:[body[data-dashboard-layout=true]_&]:!max-w-none"
        )}
        onEscapeKeyDown={(event) => {
          if (immersive) {
            event.preventDefault();
            setImmersive(false);
          }
        }}
      >
        {immersive ? (
          <div
            className="relative flex min-h-0 flex-1 flex-col bg-black"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-10 pt-3">
              <div className="pointer-events-none min-w-0 flex-1 pr-2">
                <p className="truncate text-sm font-medium text-white">
                  {selected?.fileName}
                </p>
                {documents.length > 1 && (
                  <p className="text-xs tabular-nums text-white/70">
                    {selectedIndex + 1}/{documents.length}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="pointer-events-auto h-11 w-11 shrink-0 shadow-md"
                onClick={() => setImmersive(false)}
                aria-label="Teljes képernyő bezárása"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            </div>

            <DocumentPreview
              selected={selected}
              previewUrl={previewUrl}
              loading={loading}
              error={error}
            />
          </div>
        ) : (
          <>
            <DialogHeader className="shrink-0 px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="min-w-0 flex-1 text-base sm:text-lg">
                  Dokumentum megtekintése
                </DialogTitle>
                <DialogClose
                  className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring sm:-mr-2"
                  aria-label="Bezárás"
                >
                  <X className="h-5 w-5" />
                </DialogClose>
              </div>
              {selected && (
                <p className="truncate pr-1 text-sm font-normal text-muted-foreground">
                  {selected.fileName}
                  {documents.length > 1 && (
                    <span className="ml-2 text-xs tabular-nums opacity-80">
                      {selectedIndex + 1}/{documents.length}
                    </span>
                  )}
                </p>
              )}
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t lg:flex-row">
              <div className="shrink-0 border-b px-3 py-2 lg:hidden">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Válassz dokumentumot
                </p>
                <Select
                  value={selectedId ?? undefined}
                  onValueChange={setSelectedId}
                >
                  <SelectTrigger className="h-11 w-full gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0" />
                      <SelectValue placeholder="Dokumentum kiválasztása" />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(50svh,20rem)] w-[var(--radix-select-trigger-width)]">
                    {documents.map((doc, index) => (
                      <SelectItem key={doc.id} value={doc.id} className="py-2.5">
                        <span className="line-clamp-2 break-all">
                          {index + 1}. {doc.fileName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden min-h-0 w-52 shrink-0 flex-col gap-1.5 border-r p-3 lg:flex">
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

              <div
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/20 p-3 sm:p-4 lg:rounded-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
                  <DocumentPreview
                    selected={selected}
                    previewUrl={previewUrl}
                    loading={loading}
                    error={error}
                  />

                  {canPreview && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-2 z-10 h-11 w-11 shadow-md"
                      onClick={() => setImmersive(true)}
                      aria-label="Teljes képernyő"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
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
