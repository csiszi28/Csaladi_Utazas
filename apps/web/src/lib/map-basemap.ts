"use client";

type LeafletNS = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;

/**
 * Raster basemap — lehetőleg angol címkék (Dubai helyi arab feliratok elkerülése).
 *
 * Prioritás:
 * 1. MapTiler Streets (NEXT_PUBLIC_MAPTILER_KEY) — language=en
 * 2. Google Maps road (hl=en) — kulcs nélkül, angol címkék világszerte
 * 3. Esri World Street Map (utolsó tartalék)
 */
export function addRasterBasemap(L: LeafletNS, map: LeafletMap) {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();

  if (maptilerKey) {
    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(maptilerKey)}&language=en`,
      {
        attribution:
          '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
      }
    ).addTo(map);
    return;
  }

  // Google road tiles + hl=en → Dubai utcanevek angolul (Esri WSM kétnyelvű arab+EN)
  L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en", {
    attribution: "&copy; Google",
    subdomains: ["0", "1", "2", "3"],
    maxZoom: 21,
  }).addTo(map);
}
