"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildMinimalUrlPreview, type UrlPreviewData } from "@csaladi-utazas/shared";

interface UrlPreviewCardProps {
  url: string;
  className?: string;
  compact?: boolean;
}

/** Session-level cache so tab remounts don't refetch the same URL previews. */
const previewCache = new Map<string, UrlPreviewData>();
const inflightRequests = new Map<string, Promise<UrlPreviewData>>();

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function loadUrlPreview(url: string): Promise<UrlPreviewData> {
  const cached = previewCache.get(url);
  if (cached) return cached;

  const existing = inflightRequests.get(url);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch("/api/url-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await res.json()) as { success: boolean; data?: UrlPreviewData };
      const data =
        body.success && body.data ? body.data : buildMinimalUrlPreview(url) ?? { url, title: url };
      previewCache.set(url, data);
      return data;
    } catch {
      const fallback = buildMinimalUrlPreview(url) ?? { url, title: url };
      previewCache.set(url, fallback);
      return fallback;
    } finally {
      inflightRequests.delete(url);
    }
  })();

  inflightRequests.set(url, request);
  return request;
}

function truncateUrl(raw: string, max = 72): string {
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

function UrlPreviewCardContent({
  preview,
  compact,
  className,
}: {
  preview: UrlPreviewData;
  compact: boolean;
  className?: string;
}) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/40",
        compact ? "flex-row gap-3 p-2" : "flex-col sm:flex-row sm:gap-3 sm:p-3",
        className
      )}
    >
      {preview.image && (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-muted",
            compact ? "h-14 w-14 rounded-md" : "h-32 w-full sm:h-20 sm:w-28 sm:rounded-md"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-0.5 p-2 sm:p-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {preview.title ?? preview.url}
        </p>
        {preview.description && !compact && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{preview.description}</p>
        )}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{preview.siteName ?? truncateUrl(preview.url)}</span>
        </p>
      </div>
    </a>
  );
}

export function UrlPreviewCard({ url, className, compact = false }: UrlPreviewCardProps) {
  const trimmed = url.trim();
  const cached = trimmed && isHttpUrl(trimmed) ? (previewCache.get(trimmed) ?? null) : null;
  const localFallback = trimmed ? buildMinimalUrlPreview(trimmed) : null;

  const [preview, setPreview] = useState<UrlPreviewData | null>(cached);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trimmed || !isHttpUrl(trimmed)) {
      setPreview(null);
      setLoading(false);
      return;
    }

    const hit = previewCache.get(trimmed);
    if (hit) {
      setPreview(hit);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      void loadUrlPreview(trimmed)
        .then((data) => setPreview(data))
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [trimmed]);

  if (!trimmed) return null;

  if (loading && !preview) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Előnézet betöltése…
      </div>
    );
  }

  const display = preview ?? cached ?? localFallback;
  if (!display) return null;

  return <UrlPreviewCardContent preview={display} compact={compact} className={className} />;
}
