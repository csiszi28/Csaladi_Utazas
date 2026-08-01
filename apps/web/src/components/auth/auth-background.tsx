"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type City = {
  name: string;
  lat: number;
  lon: number;
};

const CITY_CATALOG: City[] = [
  { name: "Budapest", lat: 47.5, lon: 19.04 },
  { name: "Bécs", lat: 48.21, lon: 16.37 },
  { name: "Prága", lat: 50.08, lon: 14.44 },
  { name: "Róma", lat: 41.9, lon: 12.5 },
  { name: "Lisbon", lat: 38.72, lon: -9.14 },
  { name: "Barcelona", lat: 41.39, lon: 2.17 },
  { name: "Athén", lat: 37.98, lon: 23.73 },
  { name: "Isztambul", lat: 41.01, lon: 28.98 },
  { name: "Párizs", lat: 48.86, lon: 2.35 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Amszterdam", lat: 52.37, lon: 4.9 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Zágráb", lat: 45.81, lon: 15.98 },
  { name: "Dubrovnik", lat: 42.65, lon: 18.09 },
  { name: "Milánó", lat: 45.46, lon: 9.19 },
  { name: "Madrid", lat: 40.42, lon: -3.7 },
  { name: "Porto", lat: 41.15, lon: -8.61 },
  { name: "Krakkó", lat: 50.06, lon: 19.94 },
  { name: "Varsó", lat: 52.23, lon: 21.01 },
  { name: "Stockholm", lat: 59.33, lon: 18.07 },
  { name: "Reykjavík", lat: 64.15, lon: -21.94 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Tokió", lat: 35.68, lon: 139.69 },
  { name: "Bangkok", lat: 13.76, lon: 100.5 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Kairó", lat: 30.04, lon: 31.24 },
  { name: "Marrákes", lat: 31.63, lon: -8.0 },
  { name: "Santorini", lat: 36.39, lon: 25.46 },
  { name: "Cape Town", lat: -33.92, lon: 18.42 },
  { name: "Rio", lat: -22.91, lon: -43.17 },
  { name: "Szöul", lat: 37.57, lon: 126.98 },
];

const EARTH_SPIN_DEG_PER_SEC = 4.5;
const INITIAL_LON_OFFSET = 20;
const GLOBE_R = 168;
const VISIBLE_CITY_CAP = 16;
const LABEL_MIN_DIST = 22;
/** Soft horizon fade — cities ease out near the limb instead of popping. */
const HORIZON_FADE_START = 0.06;
const HORIZON_FADE_END = 0.4;
/** Keep selected cities a bit longer so selection doesn't thrash. */
const KEEP_DEPTH = 0.14;
const ENTER_DEPTH = 0.3;
/** Opacity units per second toward target visibility. */
const FADE_SPEED = 2.8;

type Marker = City & {
  cx: number;
  cy: number;
  depth: number;
  edgeFade: number;
};

type DisplayMarker = Marker & {
  fade: number;
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return current;
}

function projectCity(city: City, lonOffsetDeg: number): Marker | null {
  const lat = (city.lat * Math.PI) / 180;
  const lon = ((city.lon - lonOffsetDeg) * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  const x = cosLat * Math.sin(lon);
  const y = -Math.sin(lat);
  const z = cosLat * Math.cos(lon);
  if (z <= 0) return null;
  const edgeFade = smoothstep(HORIZON_FADE_START, HORIZON_FADE_END, z);
  if (edgeFade <= 0) return null;
  return {
    ...city,
    cx: round(200 + x * GLOBE_R, 2),
    cy: round(200 + y * GLOBE_R, 2),
    depth: z,
    edgeFade,
  };
}

function pickVisibleMarkers(lonOffset: number, preferred: ReadonlySet<string>): Marker[] {
  const projected: Marker[] = [];
  for (const city of CITY_CATALOG) {
    const marker = projectCity(city, lonOffset);
    if (!marker) continue;
    projected.push(marker);
  }

  const byName = new Map(projected.map((m) => [m.name, m]));
  const selected: Marker[] = [];

  // Prefer keeping already-visible cities (hysteresis) while they stay above KEEP_DEPTH.
  for (const name of preferred) {
    const marker = byName.get(name);
    if (!marker || marker.depth < KEEP_DEPTH) continue;
    const tooClose = selected.some((other) => {
      const dx = marker.cx - other.cx;
      const dy = marker.cy - other.cy;
      return Math.hypot(dx, dy) < LABEL_MIN_DIST;
    });
    if (tooClose) continue;
    selected.push(marker);
    if (selected.length >= VISIBLE_CITY_CAP) {
      return selected.sort((a, b) => a.depth - b.depth);
    }
  }

  const ranked = projected
    .filter((m) => !selected.some((s) => s.name === m.name))
    .sort((a, b) => b.depth - a.depth);

  for (const marker of ranked) {
    if (marker.depth < ENTER_DEPTH && preferred.size > 0) continue;
    const tooClose = selected.some((other) => {
      const dx = marker.cx - other.cx;
      const dy = marker.cy - other.cy;
      return Math.hypot(dx, dy) < LABEL_MIN_DIST;
    });
    if (tooClose) continue;
    selected.push(marker);
    if (selected.length >= VISIBLE_CITY_CAP) break;
  }

  return selected.sort((a, b) => a.depth - b.depth);
}

function stepDisplayMarkers(
  lonOffset: number,
  previous: Map<string, DisplayMarker>,
  delta: number,
  instant: boolean
): DisplayMarker[] {
  const preferred = new Set(previous.keys());
  const wanted = pickVisibleMarkers(lonOffset, preferred);
  const wantedMap = new Map(wanted.map((m) => [m.name, m]));
  const next = new Map<string, DisplayMarker>();
  const maxDelta = instant ? 1 : FADE_SPEED * delta;

  for (const [name, existing] of previous) {
    const targetMarker = wantedMap.get(name) ?? projectCity(existing, lonOffset);
    const targetFade = targetMarker && wantedMap.has(name) ? targetMarker.edgeFade : 0;
    const fade = approach(existing.fade, targetFade, maxDelta);
    if (fade <= 0.01 && targetFade <= 0) continue;
    next.set(name, {
      ...(targetMarker ?? existing),
      fade,
    });
  }

  for (const marker of wanted) {
    if (next.has(marker.name)) continue;
    next.set(marker.name, {
      ...marker,
      fade: instant ? marker.edgeFade : approach(0, marker.edgeFade, maxDelta),
    });
  }

  return Array.from(next.values()).sort((a, b) => a.depth - b.depth);
}

/** Full-bleed atmosphere behind the auth stage. */
export function AuthAtmosphere() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-sky absolute inset-0" />
      <div className={`auth-field auth-field--a ${reduceMotion ? "" : "auth-field--live"}`} />
      <div className={`auth-field auth-field--b ${reduceMotion ? "" : "auth-field--live-alt"}`} />
      <div className={`auth-field auth-field--c ${reduceMotion ? "" : "auth-field--live"}`} />
      <div className={`auth-dust absolute inset-0 ${reduceMotion ? "" : "auth-dust--live"}`} />
      <div className="auth-vignette absolute inset-0" />
      <div className="auth-grain absolute inset-0" />
    </div>
  );
}

/** Viewport-sized wireframe globe behind the centered auth form. */
export function AuthGlobe() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lonOffset, setLonOffset] = useState(INITIAL_LON_OFFSET);
  const [markers, setMarkers] = useState<DisplayMarker[]>([]);
  const displayRef = useRef<Map<string, DisplayMarker>>(new Map());

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (reduceMotion) {
      const staticMarkers = stepDisplayMarkers(INITIAL_LON_OFFSET, new Map(), 1, true);
      displayRef.current = new Map(staticMarkers.map((m) => [m.name, m]));
      setLonOffset(INITIAL_LON_OFFSET);
      setMarkers(staticMarkers);
      return;
    }

    let frame = 0;
    let previous = performance.now();
    let lon = INITIAL_LON_OFFSET;

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;

      lon += EARTH_SPIN_DEG_PER_SEC * delta;
      if (lon >= 360) lon -= 360;

      const stepped = stepDisplayMarkers(lon, displayRef.current, delta, false);
      displayRef.current = new Map(stepped.map((m) => [m.name, m]));
      setLonOffset(lon);
      setMarkers(stepped);

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, reduceMotion]);

  const arcs = useMemo(() => {
    const front = markers.filter((m) => m.fade > 0.45 && m.depth > 0.4);
    const links: Array<[DisplayMarker, DisplayMarker]> = [];
    for (let i = 0; i < front.length - 1 && links.length < 3; i += 1) {
      links.push([front[i]!, front[i + 1]!]);
    }
    return links;
  }, [markers]);

  const meridianAngles = useMemo(() => {
    return [0, 30, 60, 90, 120, 150].map((deg) => {
      const relative = ((deg - lonOffset) * Math.PI) / 180;
      return {
        key: deg,
        rx: round(Math.max(12, Math.abs(Math.cos(relative)) * GLOBE_R), 2),
      };
    });
  }, [lonOffset]);

  return (
    <div className="auth-globe-panel" aria-hidden>
      <div className="auth-globe-wrap">
        <div className="auth-globe">
          <svg viewBox="0 0 400 400" className="h-full w-full">
            <defs>
              <radialGradient id="auth-globe-fill" cx="38%" cy="34%" r="58%">
                <stop offset="0%" stopColor="rgba(255,184,102,0.28)" />
                <stop offset="42%" stopColor="rgba(61,107,179,0.24)" />
                <stop offset="100%" stopColor="rgba(6,21,38,0.12)" />
              </radialGradient>
              <linearGradient id="auth-city-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffb866" stopOpacity="0.12" />
                <stop offset="50%" stopColor="#ffb866" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#9ec5f0" stopOpacity="0.12" />
              </linearGradient>
              <clipPath id="auth-globe-clip">
                <circle cx="200" cy="200" r="170" />
              </clipPath>
            </defs>

            <circle cx="200" cy="200" r="168" fill="url(#auth-globe-fill)" />

            <g>
              {meridianAngles.map((meridian) => (
                <ellipse
                  key={`mer-${meridian.key}`}
                  cx="200"
                  cy="200"
                  rx={meridian.rx}
                  ry={GLOBE_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1.15"
                />
              ))}
              {[-110, -55, 0, 55, 110].map((oy) => (
                <ellipse
                  key={`lat-${oy}`}
                  cx="200"
                  cy={200 + oy * 0.72}
                  rx={GLOBE_R - Math.abs(oy) * 0.72}
                  ry={22 + Math.abs(oy) * 0.04}
                  fill="none"
                  stroke="rgba(158,197,240,0.22)"
                  strokeWidth="1.15"
                />
              ))}
            </g>

            <circle
              cx="200"
              cy="200"
              r="170"
              fill="none"
              stroke="rgba(255,184,102,0.5)"
              strokeWidth="2"
            />

            {mounted ? (
              <g clipPath="url(#auth-globe-clip)">
                {arcs.map(([a, b]) => {
                  const mx = round((a.cx + b.cx) / 2);
                  const my = round((a.cy + b.cy) / 2 - 14);
                  const arcFade = Math.min(a.fade, b.fade);
                  return (
                    <path
                      key={`${a.name}-${b.name}`}
                      d={`M${a.cx},${a.cy} Q${mx},${my} ${b.cx},${b.cy}`}
                      fill="none"
                      stroke="url(#auth-city-arc)"
                      strokeWidth="1.5"
                      strokeDasharray="4 6"
                      opacity={round(arcFade * (0.3 + Math.min(a.depth, b.depth) * 0.45), 3)}
                    />
                  );
                })}

                {markers.map((city) => {
                  const warm = city.lon > -20 && city.lon < 45 && city.lat > 30 && city.lat < 60;
                  const opacity = city.fade * (0.35 + city.depth * 0.65);
                  return (
                    <g key={`dot-${city.name}`} opacity={round(opacity, 3)}>
                      <circle
                        cx={city.cx}
                        cy={city.cy}
                        r={round(5 + city.depth * 2, 2)}
                        fill={warm ? "rgba(255,184,102,0.24)" : "rgba(215,232,255,0.18)"}
                      />
                      <circle
                        cx={city.cx}
                        cy={city.cy}
                        r={round(2.4 + city.depth * 0.7, 2)}
                        fill={warm ? "#ffb866" : "#d7e8ff"}
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="0.8"
                      />
                    </g>
                  );
                })}
              </g>
            ) : null}
          </svg>

          {mounted ? (
            <div className="auth-city-layer">
              {markers.map((city) => {
                const left = round((city.cx / 400) * 100, 2);
                const top = round((city.cy / 400) * 100, 2);
                const scale = round(0.88 + city.depth * 0.22, 2);
                const opacity = round(city.fade * (0.45 + city.depth * 0.55), 3);
                return (
                  <span
                    key={city.name}
                    className="auth-city-label"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      opacity,
                      transform: `translate(-50%, -130%) scale(${scale})`,
                      zIndex: Math.round(city.depth * 20),
                    }}
                  >
                    {city.name}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="auth-compass" aria-hidden>
        <svg viewBox="0 0 140 140" className="auth-compass-face h-full w-full">
          <circle
            cx="70"
            cy="70"
            r="62"
            fill="rgba(8,24,48,0.52)"
            stroke="rgba(255,184,102,0.5)"
            strokeWidth="1.7"
          />
          <circle cx="70" cy="70" r="48" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <circle cx="70" cy="70" r="34" fill="none" stroke="rgba(255,184,102,0.2)" strokeWidth="0.9" />
          <line x1="70" y1="14" x2="70" y2="24" stroke="#ffb866" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="126" y1="70" x2="116" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="70" y1="126" x2="70" y2="116" stroke="rgba(255,255,255,0.5)" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="14" y1="70" x2="24" y2="70" stroke="rgba(255,255,255,0.5)" strokeWidth="1.7" strokeLinecap="round" />
          <g className={mounted && !reduceMotion ? "auth-compass-rose auth-compass--live" : "auth-compass-rose"}>
            <path d="M70 26 L78 70 L70 58 L62 70 Z" fill="#ffb866" />
            <path d="M70 114 L78 70 L70 82 L62 70 Z" fill="rgba(255,255,255,0.35)" />
            <path d="M114 70 L70 78 L82 70 L70 62 Z" fill="rgba(215,232,255,0.42)" />
            <path d="M26 70 L70 78 L58 70 L70 62 Z" fill="rgba(215,232,255,0.42)" />
            <circle cx="70" cy="70" r="5" fill="#fff" />
          </g>
          <text x="70" y="11" textAnchor="middle" dominantBaseline="middle" fill="#ffb866" fontSize="13" fontWeight="700">
            N
          </text>
          <text x="129" y="73" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.88)" fontSize="12" fontWeight="650">
            E
          </text>
          <text x="70" y="133" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.88)" fontSize="12" fontWeight="650">
            S
          </text>
          <text x="11" y="73" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.88)" fontSize="12" fontWeight="650">
            W
          </text>
        </svg>
      </div>
    </div>
  );
}

/** @deprecated use AuthAtmosphere + AuthGlobe */
export function AuthBackground() {
  return (
    <>
      <AuthAtmosphere />
      <AuthGlobe />
    </>
  );
}
