"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  ExternalLink,
  Hand,
  MapPin,
  Navigation,
  RotateCcw,
  Route,
  Store,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  ensureEntityCoords,
  fetchNearbyPlaces,
  resetEntityCoordsToAddress,
  updateEntityCoords,
  type NearbyPlace,
} from "@/actions/geocode";
import { Button } from "@/components/ui/button";
import { buildNavigateLinks } from "@/components/trips/geocode-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type TripMapMarkerKind =
  | "program"
  | "accommodation"
  | "transport_from"
  | "transport_to"
  | "photo"
  | "destination";

export interface TripMapMarker {
  id: string;
  entityType: "program" | "accommodation" | "transport_from" | "transport_to" | "document";
  entityId: string;
  title: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  kind: TripMapMarkerKind;
  dayKey?: string | null;
  /** HH:MM — used for daily route / pin numbering order */
  time?: string | null;
  sortOrder?: number;
  transportPairId?: string;
}

interface TripMapViewProps {
  markers: TripMapMarker[];
  className?: string;
  heightClassName?: string;
  canEdit?: boolean;
  defaultCenter?: { lat: number; lng: number } | null;
  dayOptions?: string[];
  initialDay?: string | null;
  showNearbyToggle?: boolean;
  onOpenEntity?: (marker: TripMapMarker) => void;
}

const GEO_CACHE_PREFIX = "fam-geo:";

function normalizeGeoQuery(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function geoCacheKey(id: string, locationQuery: string): string {
  return `${GEO_CACHE_PREFIX}${id}::${normalizeGeoQuery(locationQuery)}`;
}

function markerLocationQuery(m: TripMapMarker): string {
  if (m.location?.trim()) return m.location.trim();
  if (m.kind === "accommodation" || m.kind === "destination") return m.title;
  return "";
}

function readGeoCache(id: string, locationQuery: string): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem(geoCacheKey(id, locationQuery));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat: number; lng: number };
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeGeoCache(id: string, locationQuery: string, lat: number, lng: number) {
  try {
    sessionStorage.setItem(geoCacheKey(id, locationQuery), JSON.stringify({ lat, lng }));
  } catch {
    /* ignore */
  }
}

function clearGeoCacheForMarker(id: string) {
  try {
    const prefix = `${GEO_CACHE_PREFIX}${id}::`;
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

type ResolvedEntry = { lat: number; lng: number; locationQuery: string };

function seedResolved(markers: TripMapMarker[]): Record<string, ResolvedEntry> {
  const next: Record<string, ResolvedEntry> = {};
  for (const m of markers) {
    const locationQuery = markerLocationQuery(m);
    if (m.lat != null && m.lng != null) {
      next[m.id] = { lat: m.lat, lng: m.lng, locationQuery };
      continue;
    }
    const cached = readGeoCache(m.id, locationQuery);
    if (cached) next[m.id] = { ...cached, locationQuery };
  }
  return next;
}

function buildMarkersSignature(markers: TripMapMarker[]): string {
  return markers
    .map((m) => `${m.id}:${m.lat ?? ""}:${m.lng ?? ""}:${m.location ?? ""}:${m.dayKey ?? ""}`)
    .join("|");
}

function kindLabel(kind: TripMapMarkerKind): string {
  switch (kind) {
    case "accommodation":
      return "Szállás";
    case "transport_from":
      return "Indulás";
    case "transport_to":
      return "Érkezés";
    case "photo":
      return "Fotó";
    case "destination":
      return "Cél";
    default:
      return "Program";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function TripMapView({
  markers,
  className,
  heightClassName = "h-[50vh] min-h-[260px] max-h-[480px]",
  canEdit = false,
  defaultCenter = null,
  dayOptions,
  initialDay = null,
  showNearbyToggle = true,
  onOpenEntity,
}: TripMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const nearbyLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const dragModeRef = useRef(false);

  const markersSignature = buildMarkersSignature(markers);
  const days = dayOptions ?? [];

  const [resolved, setResolved] = useState<Record<string, ResolvedEntry>>(() =>
    seedResolved(markers)
  );
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | "all">(
    initialDay && days.includes(initialDay) ? initialDay : "all"
  );
  const [dragMode, setDragMode] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyAnchorTitle, setNearbyAnchorTitle] = useState<string | null>(null);
  const [resettingCoords, setResettingCoords] = useState(false);
  const [selected, setSelected] = useState<(TripMapMarker & { lat: number; lng: number }) | null>(
    null
  );

  dragModeRef.current = dragMode;

  useEffect(() => {
    if (initialDay && days.includes(initialDay)) setSelectedDay(initialDay);
  }, [initialDay, days]);

  useEffect(() => {
    const current = markersRef.current;
    setResolved((prev) => {
      let changed = false;
      const merged: Record<string, ResolvedEntry> = { ...prev };
      for (const m of current) {
        const locationQuery = markerLocationQuery(m);
        const existing = merged[m.id];
        if (
          existing &&
          normalizeGeoQuery(existing.locationQuery) !== normalizeGeoQuery(locationQuery)
        ) {
          delete merged[m.id];
          clearGeoCacheForMarker(m.id);
          changed = true;
        }
        if (m.lat != null && m.lng != null) {
          const cur = merged[m.id];
          if (
            !cur ||
            cur.lat !== m.lat ||
            cur.lng !== m.lng ||
            normalizeGeoQuery(cur.locationQuery) !== normalizeGeoQuery(locationQuery)
          ) {
            merged[m.id] = { lat: m.lat, lng: m.lng, locationQuery };
            writeGeoCache(m.id, locationQuery, m.lat, m.lng);
            changed = true;
          }
          continue;
        }
        if (!merged[m.id] && locationQuery) {
          const cached = readGeoCache(m.id, locationQuery);
          if (cached) {
            merged[m.id] = { ...cached, locationQuery };
            changed = true;
          }
        }
      }
      for (const id of Object.keys(merged)) {
        if (!current.some((m) => m.id === id)) {
          delete merged[id];
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [markersSignature]);

  const withCoords = useMemo(() => {
    return markers
      .map((m) => {
        const locationQuery = markerLocationQuery(m);
        const cached = resolved[m.id];
        const cacheMatches =
          cached &&
          normalizeGeoQuery(cached.locationQuery) === normalizeGeoQuery(locationQuery);
        const lat = cacheMatches ? cached.lat : m.lat;
        const lng = cacheMatches ? cached.lng : m.lng;
        if (lat == null || lng == null) return null;
        return { ...m, lat, lng };
      })
      .filter(Boolean) as Array<TripMapMarker & { lat: number; lng: number }>;
  }, [markers, resolved]);

  const visibleCoords = useMemo(() => {
    if (selectedDay === "all") return withCoords;
    return withCoords.filter((m) => !m.dayKey || m.dayKey === selectedDay);
  }, [withCoords, selectedDay]);

  const withCoordsRef = useRef(visibleCoords);
  withCoordsRef.current = visibleCoords;

  const withCoordsKey = useMemo(
    () =>
      visibleCoords
        .map((m) => `${m.id}:${m.lat.toFixed(5)},${m.lng.toFixed(5)}:${m.sortOrder ?? ""}`)
        .join("|"),
    [visibleCoords]
  );

  useEffect(() => {
    let cancelled = false;
    async function resolveMissing() {
      const current = markersRef.current;
      const missing = current.filter((m) => {
        if (m.kind === "destination") return false;
        const locationQuery = markerLocationQuery(m);
        if (!locationQuery) return false;
        if (m.lat != null && m.lng != null) return false;
        if (readGeoCache(m.id, locationQuery)) return false;
        return true;
      });

      // Destination: client-side geocode only (no DB entity)
      const destinations = current.filter(
        (m) =>
          m.kind === "destination" &&
          markerLocationQuery(m) &&
          m.lat == null &&
          !readGeoCache(m.id, markerLocationQuery(m))
      );

      if (missing.length === 0 && destinations.length === 0) {
        setGeocoding(false);
        return;
      }
      setGeocoding(true);

      for (const m of destinations) {
        if (cancelled) return;
        const locationQuery = markerLocationQuery(m);
        const { geocodeLocation } = await import("@/actions/geocode");
        const result = await geocodeLocation(locationQuery);
        if (cancelled) return;
        if (result.success) {
          writeGeoCache(m.id, locationQuery, result.data.lat, result.data.lng);
          setResolved((prev) => ({
            ...prev,
            [m.id]: { lat: result.data.lat, lng: result.data.lng, locationQuery },
          }));
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      for (const m of missing) {
        if (cancelled) return;
        const locationQuery = markerLocationQuery(m);
        const result = await ensureEntityCoords({
          entityType: m.entityType,
          entityId: m.entityId,
        });
        if (cancelled) return;
        if (result.success) {
          writeGeoCache(m.id, locationQuery, result.data.lat, result.data.lng);
          setResolved((prev) => ({
            ...prev,
            [m.id]: { lat: result.data.lat, lng: result.data.lng, locationQuery },
          }));
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
      if (!cancelled) setGeocoding(false);
    }
    void resolveMissing();
    return () => {
      cancelled = true;
    };
  }, [markersSignature]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function setup() {
      if (!containerRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dom = containerRef.current as any;
      if (dom._leaflet_id) {
        dom._leaflet_id = undefined;
        containerRef.current.innerHTML = "";
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      nearbyLayerRef.current = L.layerGroup().addTo(map);

      const center = defaultCenter ?? { lat: 47.1625, lng: 19.5033 };
      map.setView([center.lat, center.lng], defaultCenter ? 11 : 7);

      // Raster basemap — always works. (MapLibre bridge broke the map under Turbopack.)
      const { addRasterBasemap } = await import("@/lib/map-basemap");
      addRasterBasemap(L, map);

      const invalidate = () => map.invalidateSize({ animate: false });
      invalidate();
      requestAnimationFrame(invalidate);
      setTimeout(invalidate, 50);
      setTimeout(invalidate, 250);
      resizeObserver = new ResizeObserver(() => invalidate());
      resizeObserver.observe(containerRef.current);

      setMapReady(true);
      setError(null);
    }

    void setup().catch((err) => {
      console.error("[TripMapView] map setup failed", err);
      if (!cancelled) setError("A térkép nem tölthető be");
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      nearbyLayerRef.current = null;
      setMapReady(false);
    };
    // defaultCenter only for initial view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    const routes = routeLayerRef.current;
    if (!map || !L || !layer || !routes || !mapReady) return;

    const coords = withCoordsRef.current;
    layer.clearLayers();
    routes.clearLayers();

    if (coords.length === 0) {
      const center = defaultCenter ?? { lat: 47.1625, lng: 19.5033 };
      map.setView([center.lat, center.lng], defaultCenter ? 11 : 7);
      map.invalidateSize({ animate: false });
      return;
    }

    const bounds = L.latLngBounds([]);
    const ordered = [...coords].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    const routeStops = ordered.filter(
      (m) => m.kind === "accommodation" || m.kind === "program"
    );

    for (let i = 0; i < ordered.length; i++) {
      const m = ordered[i]!;
      const showNumber =
        selectedDay !== "all" &&
        m.sortOrder != null &&
        (m.kind === "accommodation" || m.kind === "program");
      const color =
        m.kind === "accommodation"
          ? "#0d9488"
          : m.kind.startsWith("transport")
            ? "#2563eb"
            : m.kind === "photo"
              ? "#c026d3"
              : "#ea580c";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${showNumber ? 28 : 22}px;height:${showNumber ? 28 : 22}px;
          border-radius:9999px;background:${color};color:#fff;
          border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
          font:600 11px/1 system-ui,sans-serif;">${
            showNumber ? String((m.sortOrder ?? i) + 1) : ""
          }</div>`,
        iconSize: [showNumber ? 28 : 22, showNumber ? 28 : 22],
        iconAnchor: [showNumber ? 14 : 11, showNumber ? 14 : 11],
      });

      const marker = L.marker([m.lat, m.lng], {
        icon,
        draggable: canEdit && dragModeRef.current && m.kind !== "destination",
        autoPan: true,
      });

      marker.on("click", () => setSelected(m));
      marker.on("dragend", async () => {
        const prevLat = m.lat;
        const prevLng = m.lng;
        const pos = marker.getLatLng();
        const result = await updateEntityCoords({
          entityType: m.entityType,
          entityId: m.entityId,
          lat: pos.lat,
          lng: pos.lng,
        });
        if (!result.success) {
          toast.error(result.error);
          marker.setLatLng([prevLat, prevLng]);
          return;
        }
        const locationQuery = markerLocationQuery(m);
        writeGeoCache(m.id, locationQuery, pos.lat, pos.lng);
        setResolved((prev) => ({
          ...prev,
          [m.id]: {
            lat: pos.lat,
            lng: pos.lng,
            locationQuery,
          },
        }));
        setSelected((prev) =>
          prev && prev.id === m.id ? { ...prev, lat: pos.lat, lng: pos.lng } : prev
        );
        toast.success("Pozíció mentve", {
          action: {
            label: "Vissza",
            onClick: () => {
              void (async () => {
                const undo = await updateEntityCoords({
                  entityType: m.entityType,
                  entityId: m.entityId,
                  lat: prevLat,
                  lng: prevLng,
                });
                if (!undo.success) {
                  toast.error(undo.error);
                  return;
                }
                writeGeoCache(m.id, locationQuery, prevLat, prevLng);
                setResolved((prev) => ({
                  ...prev,
                  [m.id]: {
                    lat: prevLat,
                    lng: prevLng,
                    locationQuery,
                  },
                }));
                setSelected((prev) =>
                  prev && prev.id === m.id
                    ? { ...prev, lat: prevLat, lng: prevLng }
                    : prev
                );
                toast.success("Előző pozíció visszaállítva");
              })();
            },
          },
        });
      });

      marker.bindTooltip(
        `<strong>${escapeHtml(m.title)}</strong><br/><span style="opacity:.8">${kindLabel(m.kind)}</span>`,
        { direction: "top", offset: [0, -10] }
      );
      marker.addTo(layer);
      bounds.extend([m.lat, m.lng]);
    }

    // Transport A→B lines
    const pairs = new Map<string, Array<TripMapMarker & { lat: number; lng: number }>>();
    for (const m of coords) {
      if (!m.transportPairId) continue;
      const list = pairs.get(m.transportPairId) ?? [];
      list.push(m);
      pairs.set(m.transportPairId, list);
    }
    for (const list of pairs.values()) {
      const from = list.find((x) => x.kind === "transport_from");
      const to = list.find((x) => x.kind === "transport_to");
      if (from && to) {
        L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          { color: "#2563eb", weight: 3, opacity: 0.7, dashArray: "6 6" }
        ).addTo(routes);
      }
    }

    // Day route: only accommodation + programs (not trip destination / transport / photos)
    if (selectedDay !== "all" && routeStops.length > 1) {
      L.polyline(
        routeStops.map((m) => [m.lat, m.lng] as [number, number]),
        { color: "#ea580c", weight: 3, opacity: 0.55 }
      ).addTo(routes);
    }

    if (coords.length === 1) {
      map.setView([coords[0]!.lat, coords[0]!.lng], 13);
    } else {
      map.fitBounds(bounds.pad(0.2));
    }
    map.invalidateSize({ animate: false });
    requestAnimationFrame(() => map.invalidateSize({ animate: false }));
  }, [withCoordsKey, mapReady, canEdit, dragMode, selectedDay, defaultCenter]);

  useEffect(() => {
    const L = leafletRef.current;
    const nearby = nearbyLayerRef.current;
    const map = mapRef.current;
    if (!L || !nearby || !map || !mapReady) return;

    nearby.clearLayers();
    if (!showNearby) {
      setNearbyAnchorTitle(null);
      setNearbyLoading(false);
      return;
    }

    const coords = withCoordsRef.current;
    const selectedAnchor =
      selected && coords.some((m) => m.id === selected.id)
        ? coords.find((m) => m.id === selected.id) ?? null
        : null;
    const anchor =
      selectedAnchor ??
      coords.find((m) => m.kind === "accommodation") ??
      coords.find((m) => m.kind === "program") ??
      coords[0] ??
      null;
    if (!anchor) {
      setNearbyAnchorTitle(null);
      toast.error("Nincs pont a közeli helyekhez");
      setShowNearby(false);
      return;
    }

    setNearbyAnchorTitle(anchor.title);
    let cancelled = false;
    setNearbyLoading(true);
    void fetchNearbyPlaces({ lat: anchor.lat, lng: anchor.lng, radiusMeters: 1200 }).then(
      (result) => {
        if (cancelled) return;
        setNearbyLoading(false);
        if (!result.success) {
          toast.error(result.error);
          setShowNearby(false);
          return;
        }
        if (result.data.length === 0) {
          toast.message("Nem találtunk boltot, patikát, játszóteret vagy kávézót 1,2 km-en belül", {
            description: `Középpont: ${anchor.title}`,
          });
          return;
        }
        for (const place of result.data) {
          const marker = L.circleMarker([place.lat, place.lng], {
            radius: 6,
            color: nearbyColor(place.kind),
            fillColor: nearbyColor(place.kind),
            fillOpacity: 0.85,
            weight: 1,
          });
          marker.bindPopup(
            `<strong>${escapeHtml(place.name)}</strong><br/>${nearbyKindLabel(place.kind)}`
          );
          marker.addTo(nearby);
        }
        toast.success(`${result.data.length} közeli hely (${anchor.title} körül)`);
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNearby, withCoordsKey, mapReady, selected?.id]);

  const routeOrigin = selected ? resolveRouteOrigin(selected, visibleCoords) : null;
  const navLinks = selected
    ? buildNavigateLinks({
        destination: {
          lat: selected.lat,
          lng: selected.lng,
          label: selected.title,
        },
        origin: routeOrigin
          ? { lat: routeOrigin.lat, lng: routeOrigin.lng, label: routeOrigin.title }
          : null,
      })
    : null;

  if (markers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        Nincs helyszín a térképhez. Adj meg címet programoknál, szállásnál vagy közlekedésnél.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {days.length > 0 ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <DayChip
            active={selectedDay === "all"}
            label="Összes"
            onClick={() => setSelectedDay("all")}
          />
          {days.map((day) => (
            <DayChip
              key={day}
              active={selectedDay === day}
              label={day.slice(5)}
              onClick={() => setSelectedDay(day)}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant={dragMode ? "default" : "outline"}
            className="min-h-9 gap-1.5"
            onClick={() => setDragMode((v) => !v)}
          >
            <Hand className="h-3.5 w-3.5" />
            {dragMode ? "Húzás be" : "Pin mozgatás"}
          </Button>
        ) : null}
        {showNearbyToggle ? (
          <Button
            type="button"
            size="sm"
            variant={showNearby ? "default" : "outline"}
            className="min-h-9 gap-1.5"
            disabled={nearbyLoading || visibleCoords.length === 0}
            onClick={() => setShowNearby((v) => !v)}
            title={
              selected
                ? `Kiválasztott marker körül: ${selected.title}`
                : "Első szállás (vagy program) körül"
            }
          >
            <Store className="h-3.5 w-3.5" />
            {nearbyLoading ? "Közeli…" : "Közeli helyek"}
          </Button>
        ) : null}
        {showNearby && nearbyAnchorTitle ? (
          <span className="inline-flex min-h-9 max-w-[14rem] items-center truncate rounded-md border px-2 text-xs text-muted-foreground">
            Középpont: {nearbyAnchorTitle}
          </span>
        ) : null}
        {selectedDay !== "all" ? (
          <span className="inline-flex min-h-9 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground">
            <Route className="h-3.5 w-3.5" />
            Napi útvonal
          </span>
        ) : null}
      </div>

      <div className={cn("relative w-full overflow-hidden rounded-xl border", heightClassName)}>
        <div
          ref={containerRef}
          className="absolute inset-0 z-0 bg-muted/30 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:font-sans"
        />
        {visibleCoords.length === 0 ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 px-4 text-center text-sm text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <p>{geocoding ? "Helyszínek geokódolása…" : "Nincs megjeleníthető koordináta"}</p>
          </div>
        ) : null}
      </div>

      {selected && navLinks ? (
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {kindLabel(selected.kind)}
              </p>
              <p className="truncate text-sm font-semibold">{selected.title}</p>
              {selected.location ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {selected.location}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setSelected(null)}
            >
              Bezár
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ActionLink href={navLinks.google} label="Google" icon={<Navigation className="h-3.5 w-3.5" />} />
            <ActionLink href={navLinks.apple} label="Apple" icon={<Navigation className="h-3.5 w-3.5" />} />
            <ActionLink href={navLinks.osm} label="OSM" icon={<ExternalLink className="h-3.5 w-3.5" />} />
            {onOpenEntity && selected.kind !== "destination" && selected.kind !== "photo" ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-[var(--touch-target)] gap-1.5 sm:min-h-9"
                onClick={() => onOpenEntity(selected)}
              >
                <Crosshair className="h-3.5 w-3.5" />
                Megnyitás
              </Button>
            ) : null}
          </div>
          {routeOrigin ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Útvonal: {routeOrigin.title} → {selected.title}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Nincs másik útpont — a helyszín nyílik meg (nem a GPS-edből indul).
            </p>
          )}
          {canEdit && selected.kind !== "destination" && markerLocationQuery(selected) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full gap-1.5"
              disabled={resettingCoords}
              onClick={() => {
                void (async () => {
                  setResettingCoords(true);
                  try {
                    const result = await resetEntityCoordsToAddress({
                      entityType: selected.entityType,
                      entityId: selected.entityId,
                    });
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    const locationQuery = markerLocationQuery(selected);
                    clearGeoCacheForMarker(selected.id);
                    writeGeoCache(selected.id, locationQuery, result.data.lat, result.data.lng);
                    setResolved((prev) => ({
                      ...prev,
                      [selected.id]: {
                        lat: result.data.lat,
                        lng: result.data.lng,
                        locationQuery,
                      },
                    }));
                    setSelected((prev) =>
                      prev && prev.id === selected.id
                        ? { ...prev, lat: result.data.lat, lng: result.data.lng }
                        : prev
                    );
                    toast.success("Pin visszaállítva a cím alapján");
                  } finally {
                    setResettingCoords(false);
                  }
                })();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {resettingCoords ? "Visszaállítás…" : "Cím alapján visszaállít"}
            </Button>
          ) : null}
          {dragMode && canEdit ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Húzd a pint a pontos helyre — mentés után a toastból azonnal vissza is vonhatod.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-1 sm:hidden">
          {visibleCoords.slice(0, 8).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex min-h-[var(--touch-target)] w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted/50"
                onClick={() => setSelected(m)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{m.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Pick a trip pin as route start so Maps does not use device GPS. */
function resolveRouteOrigin(
  destination: TripMapMarker & { lat: number; lng: number },
  all: Array<TripMapMarker & { lat: number; lng: number }>
): (TripMapMarker & { lat: number; lng: number }) | null {
  const candidates = all.filter(
    (m) =>
      m.id !== destination.id &&
      m.kind !== "destination" &&
      m.kind !== "photo"
  );
  if (candidates.length === 0) return null;

  if (destination.sortOrder != null && destination.dayKey) {
    const prev = candidates
      .filter(
        (m) =>
          m.dayKey === destination.dayKey &&
          m.sortOrder != null &&
          (m.sortOrder ?? 0) < (destination.sortOrder ?? 0)
      )
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .at(-1);
    if (prev) return prev;
  }

  if (destination.kind === "program") {
    const accommodation = candidates.find((m) => m.kind === "accommodation");
    if (accommodation) return accommodation;
    const otherProgram = candidates
      .filter((m) => m.kind === "program")
      .sort(
        (a, b) =>
          haversineKm(destination, a) - haversineKm(destination, b)
      )[0];
    if (otherProgram) return otherProgram;
  }

  if (destination.kind === "accommodation") {
    const program = candidates
      .filter((m) => m.kind === "program")
      .sort(
        (a, b) =>
          haversineKm(destination, a) - haversineKm(destination, b)
      )[0];
    if (program) return program;
  }

  if (destination.kind === "transport_to") {
    const from = candidates.find(
      (m) =>
        m.kind === "transport_from" &&
        m.transportPairId &&
        m.transportPairId === destination.transportPairId
    );
    if (from) return from;
  }

  return [...candidates].sort(
    (a, b) => haversineKm(destination, a) - haversineKm(destination, b)
  )[0]!;
}

function DayChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[var(--touch-target)] shrink-0 rounded-xl border px-3 py-2 text-sm font-medium tabular-nums transition-colors sm:min-h-9",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-muted/40 text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function ActionLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Button asChild variant="outline" className="min-h-[var(--touch-target)] gap-1.5 sm:min-h-9">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {icon}
        {label}
      </a>
    </Button>
  );
}

function nearbyColor(kind: NearbyPlace["kind"]): string {
  switch (kind) {
    case "pharmacy":
      return "#16a34a";
    case "playground":
      return "#db2777";
    case "cafe":
      return "#b45309";
    case "shop":
      return "#4f46e5";
    default:
      return "#64748b";
  }
}

function nearbyKindLabel(kind: NearbyPlace["kind"]): string {
  switch (kind) {
    case "pharmacy":
      return "Gyógyszertár";
    case "playground":
      return "Játszótér";
    case "cafe":
      return "Kávézó";
    case "shop":
      return "Bolt";
    default:
      return "Hely";
  }
}

export function buildTripMapMarkers(trip: {
  programs: Array<{
    id: string;
    title: string;
    location: string | null;
    date?: Date | string;
    startTime?: string | null;
    lat?: number | null;
    lng?: number | null;
  }>;
  accommodations: Array<{
    id: string;
    title: string;
    location: string | null;
    checkIn?: Date | string;
    lat?: number | null;
    lng?: number | null;
  }>;
  transports?: Array<{
    id: string;
    title: string;
    departureDate?: Date | string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    fromLocation?: string | null;
    toLocation?: string | null;
    fromLat?: number | null;
    fromLng?: number | null;
    toLat?: number | null;
    toLng?: number | null;
  }>;
  photos?: Array<{
    id: string;
    fileName: string;
    locationLabel?: string | null;
    lat?: number | null;
    lng?: number | null;
  }>;
}): TripMapMarker[] {
  const markers: TripMapMarker[] = [];
  const formatDay = (value: Date | string | undefined) => {
    if (!value) return null;
    const d = typeof value === "string" ? new Date(value) : value;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  };

  const normalizeTime = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const trimmed = time.trim();
    return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : null;
  };

  for (const p of trip.programs) {
    if (!p.location && p.lat == null) continue;
    markers.push({
      id: `program:${p.id}`,
      entityType: "program",
      entityId: p.id,
      title: p.title,
      location: p.location,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      kind: "program",
      dayKey: formatDay(p.date),
      time: normalizeTime(p.startTime),
    });
  }
  for (const a of trip.accommodations) {
    if (!a.location && !a.title && a.lat == null) continue;
    markers.push({
      id: `acc:${a.id}`,
      entityType: "accommodation",
      entityId: a.id,
      title: a.title,
      location: a.location,
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      kind: "accommodation",
      dayKey: formatDay(a.checkIn),
      // Hub at start of check-in day when no clock time exists
      time: "00:00",
    });
  }
  for (const t of trip.transports ?? []) {
    const dayKey = formatDay(t.departureDate);
    if (t.fromLocation || t.fromLat != null) {
      markers.push({
        id: `transport-from:${t.id}`,
        entityType: "transport_from",
        entityId: t.id,
        title: `${t.title} (indulás)`,
        location: t.fromLocation ?? null,
        lat: t.fromLat ?? null,
        lng: t.fromLng ?? null,
        kind: "transport_from",
        dayKey,
        transportPairId: t.id,
        time: normalizeTime(t.departureTime),
      });
    }
    if (t.toLocation || t.toLat != null) {
      markers.push({
        id: `transport-to:${t.id}`,
        entityType: "transport_to",
        entityId: t.id,
        title: `${t.title} (érkezés)`,
        location: t.toLocation ?? null,
        lat: t.toLat ?? null,
        lng: t.toLng ?? null,
        kind: "transport_to",
        dayKey,
        transportPairId: t.id,
        time: normalizeTime(t.arrivalTime) ?? normalizeTime(t.departureTime),
      });
    }
  }
  for (const photo of trip.photos ?? []) {
    if (!photo.locationLabel && photo.lat == null) continue;
    markers.push({
      id: `photo:${photo.id}`,
      entityType: "document",
      entityId: photo.id,
      title: photo.fileName,
      location: photo.locationLabel ?? null,
      lat: photo.lat ?? null,
      lng: photo.lng ?? null,
      kind: "photo",
    });
  }

  // Chronological route order: only accommodation + programs get sort numbers / day line
  const byDay = new Map<string, TripMapMarker[]>();
  for (const m of markers) {
    if (!m.dayKey) continue;
    if (m.kind !== "accommodation" && m.kind !== "program") continue;
    const list = byDay.get(m.dayKey) ?? [];
    list.push(m);
    byDay.set(m.dayKey, list);
  }
  for (const list of byDay.values()) {
    list
      .sort((a, b) => {
        const ta = a.time && /^\d{2}:\d{2}$/.test(a.time) ? a.time : "99:99";
        const tb = b.time && /^\d{2}:\d{2}$/.test(b.time) ? b.time : "99:99";
        if (ta !== tb) return ta.localeCompare(tb);
        const rank = (k: TripMapMarkerKind) => (k === "accommodation" ? 0 : 1);
        const rk = rank(a.kind) - rank(b.kind);
        if (rk !== 0) return rk;
        return a.id.localeCompare(b.id);
      })
      .forEach((m, index) => {
        m.sortOrder = index;
      });
  }

  return markers;
}
