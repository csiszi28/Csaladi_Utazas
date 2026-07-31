"use client";

type LeafletNS = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;

/** Reliable raster basemap (CARTO Voyager). */
export function addRasterBasemap(L: LeafletNS, map: LeafletMap) {
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }).addTo(map);
}
