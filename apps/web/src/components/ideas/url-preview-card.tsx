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
  const [preview, setPreview] = useState<UrlPreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmed = url.trim();
  const localFallback = trimmed ? buildMinimalUrlPreview(trimmed) : null;

  useEffect(() => {
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/url-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const body = (await res.json()) as { success: boolean; data?: UrlPreviewData };
        if (body.success && body.data) {
          setPreview(body.data);
        } else {
          setPreview(buildMinimalUrlPreview(trimmed));
        }
      } catch {
        setPreview(buildMinimalUrlPreview(trimmed));
      } finally {
        setLoading(false);
      }
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

  const display = preview ?? localFallback;
  if (!display) return null;

  return <UrlPreviewCardContent preview={display} compact={compact} className={className} />;
}
