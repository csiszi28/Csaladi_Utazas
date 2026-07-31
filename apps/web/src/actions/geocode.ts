"use server";

import { prisma } from "@csaladi-utazas/database";
import {
  geocodeLocationSchema,
  nearbyPlacesSchema,
  updateEntityCoordsSchema,
} from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { requireTripEditor, findAccessibleTrip } from "@/lib/trip-access";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import type { ActionResult } from "./auth";

const NOMINATIM_UA = "CsaladiUtazas/1.0 (family travel planner; contact@local)";
/** Prefer Hungarian, then English — avoids local-script names (e.g. Arabic in Dubai). */
const NOMINATIM_LANG = "hu,en";

export type GeocodeHit = {
  lat: number;
  lng: number;
  displayName: string;
};

export type NearbyPlace = {
  id: string;
  name: string;
  kind: "shop" | "pharmacy" | "playground" | "cafe" | "other";
  lat: number;
  lng: number;
};

function pickOsmName(tags: Record<string, string> | undefined): string {
  if (!tags) return "Hely";
  return (
    tags["name:hu"] ||
    tags["name:en"] ||
    tags.int_name ||
    tags["name:de"] ||
    tags.name ||
    tags.brand ||
    tags.shop ||
    tags.amenity ||
    "Hely"
  );
}

function pickNominatimDisplayName(row: {
  display_name: string;
  namedetails?: Record<string, string>;
}): string {
  const details = row.namedetails;
  if (details) {
    const preferred =
      details["name:hu"] || details["name:en"] || details.int_name || details.name;
    // If Nominatim already localized display_name, keep the full address path.
    // Only swap when the primary name exists in a preferred language and differs.
    if (preferred && details.name && preferred !== details.name) {
      return row.display_name.replace(details.name, preferred);
    }
  }
  return row.display_name;
}

async function nominatimSearch(
  query: string,
  limit: number
): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", NOMINATIM_LANG);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": NOMINATIM_UA,
      Accept: "application/json",
      "Accept-Language": NOMINATIM_LANG,
    },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    namedetails?: Record<string, string>;
  }>;

  return data.map((row) => ({
    lat: Number(row.lat),
    lng: Number(row.lon),
    displayName: pickNominatimDisplayName(row),
  }));
}

export async function searchLocations(
  query: string,
  limit = 5
): Promise<ActionResult<GeocodeHit[]>> {
  await requireUser();
  const parsed = geocodeLocationSchema.safeParse({ query, limit });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen keresés" };
  }

  try {
    const hits = await nominatimSearch(parsed.data.query, parsed.data.limit ?? 5);
    return { success: true, data: hits };
  } catch {
    return { success: false, error: "A helykeresés sikertelen" };
  }
}

export async function geocodeLocation(query: string): Promise<
  ActionResult<{ lat: number; lng: number; displayName: string }>
> {
  const result = await searchLocations(query, 1);
  if (!result.success) return result;
  const first = result.data[0];
  if (!first) return { success: false, error: "Nincs találat erre a címre" };
  return { success: true, data: first };
}

export async function ensureEntityCoords(data: {
  entityType: "program" | "accommodation" | "transport_from" | "transport_to" | "document";
  entityId: string;
}): Promise<ActionResult<{ lat: number; lng: number }>> {
  const user = await requireUser();

  if (data.entityType === "program") {
    const program = await prisma.program.findFirst({
      where: { id: data.entityId },
      select: { id: true, tripId: true, location: true, lat: true, lng: true },
    });
    if (!program) return { success: false, error: "Program nem található" };
    const trip = await findAccessibleTrip(program.tripId, user.id);
    if (!trip) return { success: false, error: "Nincs hozzáférés" };

    if (program.lat != null && program.lng != null) {
      return { success: true, data: { lat: program.lat, lng: program.lng } };
    }
    if (!program.location?.trim()) {
      return { success: false, error: "Nincs megadott helyszín" };
    }

    const geo = await geocodeLocation(program.location);
    if (!geo.success) return geo;

    const access = await requireTripEditor(program.tripId, user.id);
    if (access.ok) {
      await prisma.program.update({
        where: { id: program.id },
        data: { lat: geo.data.lat, lng: geo.data.lng },
      });
      invalidateTripsAndReports(user.id, program.tripId);
    }

    return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
  }

  if (data.entityType === "accommodation") {
    const accommodation = await prisma.accommodation.findFirst({
      where: { id: data.entityId },
      select: { id: true, tripId: true, location: true, lat: true, lng: true, title: true },
    });
    if (!accommodation) return { success: false, error: "Szállás nem található" };
    const trip = await findAccessibleTrip(accommodation.tripId, user.id);
    if (!trip) return { success: false, error: "Nincs hozzáférés" };

    if (accommodation.lat != null && accommodation.lng != null) {
      return { success: true, data: { lat: accommodation.lat, lng: accommodation.lng } };
    }

    const query = accommodation.location?.trim() || accommodation.title;
    const geo = await geocodeLocation(query);
    if (!geo.success) return geo;

    const access = await requireTripEditor(accommodation.tripId, user.id);
    if (access.ok) {
      await prisma.accommodation.update({
        where: { id: accommodation.id },
        data: { lat: geo.data.lat, lng: geo.data.lng },
      });
      invalidateTripsAndReports(user.id, accommodation.tripId);
    }

    return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
  }

  if (data.entityType === "document") {
    const doc = await prisma.document.findFirst({
      where: { id: data.entityId },
      select: {
        id: true,
        tripId: true,
        locationLabel: true,
        lat: true,
        lng: true,
        category: true,
      },
    });
    if (!doc) return { success: false, error: "Dokumentum nem található" };
    const trip = await findAccessibleTrip(doc.tripId, user.id);
    if (!trip) return { success: false, error: "Nincs hozzáférés" };

    if (doc.lat != null && doc.lng != null) {
      return { success: true, data: { lat: doc.lat, lng: doc.lng } };
    }
    if (!doc.locationLabel?.trim()) {
      return { success: false, error: "Nincs megadott helyszín a fotón" };
    }

    const geo = await geocodeLocation(doc.locationLabel);
    if (!geo.success) return geo;

    const access = await requireTripEditor(doc.tripId, user.id);
    if (access.ok) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { lat: geo.data.lat, lng: geo.data.lng },
      });
      invalidateTripsAndReports(user.id, doc.tripId);
    }

    return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
  }

  const transport = await prisma.transport.findFirst({
    where: { id: data.entityId },
    select: {
      id: true,
      tripId: true,
      fromLocation: true,
      toLocation: true,
      fromLat: true,
      fromLng: true,
      toLat: true,
      toLng: true,
      title: true,
    },
  });
  if (!transport) return { success: false, error: "Közlekedés nem található" };
  const trip = await findAccessibleTrip(transport.tripId, user.id);
  if (!trip) return { success: false, error: "Nincs hozzáférés" };

  const isFrom = data.entityType === "transport_from";
  const existingLat = isFrom ? transport.fromLat : transport.toLat;
  const existingLng = isFrom ? transport.fromLng : transport.toLng;
  if (existingLat != null && existingLng != null) {
    return { success: true, data: { lat: existingLat, lng: existingLng } };
  }

  const query = isFrom
    ? transport.fromLocation?.trim()
    : transport.toLocation?.trim();
  if (!query) {
    return {
      success: false,
      error: isFrom ? "Nincs indulási helyszín" : "Nincs érkezési helyszín",
    };
  }

  const geo = await geocodeLocation(query);
  if (!geo.success) return geo;

  const access = await requireTripEditor(transport.tripId, user.id);
  if (access.ok) {
    await prisma.transport.update({
      where: { id: transport.id },
      data: isFrom
        ? { fromLat: geo.data.lat, fromLng: geo.data.lng }
        : { toLat: geo.data.lat, toLng: geo.data.lng },
    });
    invalidateTripsAndReports(user.id, transport.tripId);
  }

  return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
}

export async function updateEntityCoords(data: {
  entityType: "program" | "accommodation" | "transport_from" | "transport_to" | "document";
  entityId: string;
  lat: number;
  lng: number;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateEntityCoordsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  if (parsed.data.entityType === "program") {
    const program = await prisma.program.findFirst({
      where: { id: parsed.data.entityId },
      select: { tripId: true },
    });
    if (!program) return { success: false, error: "Program nem található" };
    const access = await requireTripEditor(program.tripId, user.id);
    if (!access.ok) return { success: false, error: access.error };
    await prisma.program.update({
      where: { id: parsed.data.entityId },
      data: { lat: parsed.data.lat, lng: parsed.data.lng },
    });
    invalidateTripsAndReports(user.id, program.tripId);
    return { success: true, data: undefined };
  }

  if (parsed.data.entityType === "accommodation") {
    const accommodation = await prisma.accommodation.findFirst({
      where: { id: parsed.data.entityId },
      select: { tripId: true },
    });
    if (!accommodation) return { success: false, error: "Szállás nem található" };
    const access = await requireTripEditor(accommodation.tripId, user.id);
    if (!access.ok) return { success: false, error: access.error };
    await prisma.accommodation.update({
      where: { id: parsed.data.entityId },
      data: { lat: parsed.data.lat, lng: parsed.data.lng },
    });
    invalidateTripsAndReports(user.id, accommodation.tripId);
    return { success: true, data: undefined };
  }

  if (parsed.data.entityType === "document") {
    const doc = await prisma.document.findFirst({
      where: { id: parsed.data.entityId },
      select: { tripId: true },
    });
    if (!doc) return { success: false, error: "Dokumentum nem található" };
    const access = await requireTripEditor(doc.tripId, user.id);
    if (!access.ok) return { success: false, error: access.error };
    await prisma.document.update({
      where: { id: parsed.data.entityId },
      data: { lat: parsed.data.lat, lng: parsed.data.lng },
    });
    invalidateTripsAndReports(user.id, doc.tripId);
    return { success: true, data: undefined };
  }

  const transport = await prisma.transport.findFirst({
    where: { id: parsed.data.entityId },
    select: { tripId: true },
  });
  if (!transport) return { success: false, error: "Közlekedés nem található" };
  const access = await requireTripEditor(transport.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  await prisma.transport.update({
    where: { id: parsed.data.entityId },
    data:
      parsed.data.entityType === "transport_from"
        ? { fromLat: parsed.data.lat, fromLng: parsed.data.lng }
        : { toLat: parsed.data.lat, toLng: parsed.data.lng },
  });
  invalidateTripsAndReports(user.id, transport.tripId);
  return { success: true, data: undefined };
}

export async function resetEntityCoordsToAddress(data: {
  entityType: "program" | "accommodation" | "transport_from" | "transport_to" | "document";
  entityId: string;
}): Promise<ActionResult<{ lat: number; lng: number }>> {
  const user = await requireUser();
  const { entityType, entityId } = data;

  if (entityType === "program") {
    const program = await prisma.program.findFirst({
      where: { id: entityId },
      select: { id: true, tripId: true, location: true },
    });
    if (!program) return { success: false, error: "Program nem található" };
    const access = await requireTripEditor(program.tripId, user.id);
    if (!access.ok) return { success: false, error: access.error };
    if (!program.location?.trim()) {
      return { success: false, error: "Nincs megadott cím a programnál" };
    }

    await prisma.program.update({
      where: { id: program.id },
      data: { lat: null, lng: null },
    });

    const geo = await geocodeLocation(program.location);
    if (!geo.success) return geo;

    await prisma.program.update({
      where: { id: program.id },
      data: { lat: geo.data.lat, lng: geo.data.lng },
    });
    invalidateTripsAndReports(user.id, program.tripId);
    return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
  }

  if (entityType === "accommodation") {
    const accommodation = await prisma.accommodation.findFirst({
      where: { id: entityId },
      select: { id: true, tripId: true, location: true, title: true },
    });
    if (!accommodation) return { success: false, error: "Szállás nem található" };
    const access = await requireTripEditor(accommodation.tripId, user.id);
    if (!access.ok) return { success: false, error: access.error };

    const query = accommodation.location?.trim() || accommodation.title;
    if (!query.trim()) {
      return { success: false, error: "Nincs megadott cím a szállásnál" };
    }

    await prisma.accommodation.update({
      where: { id: accommodation.id },
      data: { lat: null, lng: null },
    });

    const geo = await geocodeLocation(query);
    if (!geo.success) return geo;

    await prisma.accommodation.update({
      where: { id: accommodation.id },
      data: { lat: geo.data.lat, lng: geo.data.lng },
    });
    invalidateTripsAndReports(user.id, accommodation.tripId);
    return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
  }

  if (entityType === "document") {
    const doc = await prisma.document.findFirst({
      where: { id: entityId },
      select: { id: true, tripId: true, locationLabel: true },
    });
    if (!doc) return { success: false, error: "Dokumentum nem található" };
    const access = await requireTripEditor(doc.tripId, user.id);
    if (!access.ok) return { success: false, error: access.error };
    if (!doc.locationLabel?.trim()) {
      return { success: false, error: "Nincs megadott helyszín a fotón" };
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: { lat: null, lng: null },
    });

    const geo = await geocodeLocation(doc.locationLabel);
    if (!geo.success) return geo;

    await prisma.document.update({
      where: { id: doc.id },
      data: { lat: geo.data.lat, lng: geo.data.lng },
    });
    invalidateTripsAndReports(user.id, doc.tripId);
    return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
  }

  const transport = await prisma.transport.findFirst({
    where: { id: entityId },
    select: {
      id: true,
      tripId: true,
      fromLocation: true,
      toLocation: true,
    },
  });
  if (!transport) return { success: false, error: "Közlekedés nem található" };
  const access = await requireTripEditor(transport.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const isFrom = entityType === "transport_from";
  const query = isFrom
    ? transport.fromLocation?.trim()
    : transport.toLocation?.trim();
  if (!query) {
    return {
      success: false,
      error: isFrom ? "Nincs indulási helyszín" : "Nincs érkezési helyszín",
    };
  }

  await prisma.transport.update({
    where: { id: transport.id },
    data: isFrom
      ? { fromLat: null, fromLng: null }
      : { toLat: null, toLng: null },
  });

  const geo = await geocodeLocation(query);
  if (!geo.success) return geo;

  await prisma.transport.update({
    where: { id: transport.id },
    data: isFrom
      ? { fromLat: geo.data.lat, fromLng: geo.data.lng }
      : { toLat: geo.data.lat, toLng: geo.data.lng },
  });
  invalidateTripsAndReports(user.id, transport.tripId);
  return { success: true, data: { lat: geo.data.lat, lng: geo.data.lng } };
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

export async function fetchNearbyPlaces(data: {
  lat: number;
  lng: number;
  radiusMeters?: number;
}): Promise<ActionResult<NearbyPlace[]>> {
  await requireUser();
  const parsed = nearbyPlacesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const { lat, lng, radiusMeters = 1200 } = parsed.data;
  const query = `
[out:json][timeout:25];
(
  nwr["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
  nwr["leisure"="playground"](around:${radiusMeters},${lat},${lng});
  nwr["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
  nwr["shop"~"supermarket|convenience|bakery|mall|greengrocer"](around:${radiusMeters},${lat},${lng});
);
out center 40;
`;
  const body = `data=${encodeURIComponent(query)}`;

  let lastError = "A közeli helyek lekérése sikertelen";

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": NOMINATIM_UA,
        },
        body,
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);

      if (!res.ok) {
        lastError = "A közeli helyek lekérése sikertelen";
        continue;
      }

      const json = (await res.json()) as {
        elements?: Array<{
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const places: NearbyPlace[] = [];
      for (const el of json.elements ?? []) {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (elLat == null || elLng == null) continue;
        const tags = el.tags ?? {};
        const name = pickOsmName(tags);
        let kind: NearbyPlace["kind"] = "other";
        if (tags.amenity === "pharmacy") kind = "pharmacy";
        else if (tags.leisure === "playground") kind = "playground";
        else if (tags.amenity === "cafe") kind = "cafe";
        else if (tags.shop) kind = "shop";

        places.push({
          id: `osm:${el.id}`,
          name,
          kind,
          lat: elLat,
          lng: elLng,
        });
        if (places.length >= 24) break;
      }

      return { success: true, data: places };
    } catch {
      lastError = "A közeli helyek lekérése sikertelen";
    }
  }

  return { success: false, error: lastError };
}
