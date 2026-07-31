"use client";

import { AlertCircle, CheckCircle2, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type GeocodeStatus = "ok" | "missing" | "pending" | "failed";

export function resolveGeocodeStatus(input: {
  location: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
}): GeocodeStatus {
  const hasLocation = Boolean(input.location?.trim());
  if (!hasLocation) return "missing";
  if (input.lat != null && input.lng != null) return "ok";
  return "pending";
}

const LABELS: Record<GeocodeStatus, string> = {
  ok: "Térképen",
  missing: "Nincs cím",
  pending: "Geokódolás…",
  failed: "Sikertelen",
};

export function GeocodeStatusBadge({
  status,
  className,
}: {
  status: GeocodeStatus;
  className?: string;
}) {
  if (status === "ok") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300",
          className
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        {LABELS.ok}
      </span>
    );
  }
  if (status === "missing") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
          className
        )}
      >
        <MapPinOff className="h-3 w-3" />
        {LABELS.missing}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200",
        className
      )}
    >
      <AlertCircle className="h-3 w-3" />
      {status === "failed" ? LABELS.failed : LABELS.pending}
    </span>
  );
}

export function buildNavigateLinks(input: {
  destination: { lat: number; lng: number; label?: string };
  origin?: { lat: number; lng: number; label?: string } | null;
}) {
  const to = input.destination;
  const from = input.origin;
  const q = encodeURIComponent(to.label || `${to.lat},${to.lng}`);

  if (from) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}`,
      apple: `https://maps.apple.com/?saddr=${from.lat},${from.lng}&daddr=${to.lat},${to.lng}`,
      osm: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`,
      geo: `geo:${to.lat},${to.lng}?q=${to.lat},${to.lng}(${q})`,
    };
  }

  // Single place — open the pin, do not start turn-by-turn from device GPS.
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${to.lat},${to.lng}`,
    apple: `https://maps.apple.com/?ll=${to.lat},${to.lng}&q=${q}`,
    osm: `https://www.openstreetmap.org/?mlat=${to.lat}&mlon=${to.lng}#map=16/${to.lat}/${to.lng}`,
    geo: `geo:${to.lat},${to.lng}?q=${to.lat},${to.lng}(${q})`,
  };
}
