"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  SPLASH_BG,
  SPLASH_FETCH_BUDGET_MS,
  beginSplashExit,
  cleanupSplashPrep,
  getSplashDisplayMs,
  getSplashFadeMs,
  markSplashSeen,
  prefersReducedMotion,
  shouldShowSplash,
  startActivityTracking,
  syncSplashDocumentState,
} from "@/lib/app-splash";
import {
  buildIntroPlan,
  fetchIntroTrips,
  readCachedIntroTrips,
  type IntroPlan,
} from "@/lib/trip-intro";
import { TRIP_INTRO_MS, TripIntro } from "@/components/pwa/trip-intro";

/** Márkás splash hossza a /auth oldalakon (kijelentkezett felhasználó). */
const AUTH_SPLASH_MS = 1000;

interface AppSplashProps {
  crossfadeMs: number;
  onFadeStart?: () => void;
  onFinished?: () => void;
}

/**
 * Időzítés és dokumentum-osztályok. A márkás réteg a layout.tsx #app-splash-blocker;
 * ha van közelgő út, afölé kerül a teljes oldalas TripIntro animáció.
 */
export function AppSplash({ crossfadeMs, onFadeStart, onFinished }: AppSplashProps) {
  const [active, setActive] = useState(false);
  /** undefined = még döntünk, null = nincs közelgő út (márkás splash) */
  const [plan, setPlan] = useState<IntroPlan | null | undefined>(undefined);
  const onFadeStartRef = useRef(onFadeStart);
  const onFinishedRef = useRef(onFinished);
  const timersRef = useRef<number[]>([]);
  const exitingRef = useRef(false);

  useEffect(() => {
    onFadeStartRef.current = onFadeStart;
    onFinishedRef.current = onFinished;
  }, [onFadeStart, onFinished]);

  useEffect(() => startActivityTracking(), []);

  useLayoutEffect(() => {
    if (!shouldShowSplash()) {
      onFinishedRef.current?.();
      return;
    }

    syncSplashDocumentState();
    setActive(true);
  }, []);

  // Úti adat: gyorsítótárból azonnal, különben a szerverről rövid időkerettel.
  useEffect(() => {
    if (!active) return;

    if (prefersReducedMotion()) {
      setPlan(null);
      void fetchIntroTrips(SPLASH_FETCH_BUDGET_MS);
      document.documentElement.classList.remove("intro-pending");
      return;
    }

    let cancelled = false;
    const cachedPlan = buildIntroPlan(readCachedIntroTrips());

    if (cachedPlan) {
      setPlan(cachedPlan);
      void fetchIntroTrips(SPLASH_FETCH_BUDGET_MS); // háttérfrissítés a következő megnyitásra
      return;
    }

    void fetchIntroTrips(SPLASH_FETCH_BUDGET_MS).then((trips) => {
      if (cancelled) return;
      const resolved = buildIntroPlan(trips);
      // A boot script a gyorsítótár alapján "intro-pending"-et jelezhetett: ha mégsincs terv, jöhet a márkás kép.
      if (!resolved) document.documentElement.classList.remove("intro-pending");
      setPlan(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  const startExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    beginSplashExit();
    onFadeStartRef.current?.();

    window.setTimeout(() => {
      markSplashSeen();
      setActive(false);
      cleanupSplashPrep();
      onFinishedRef.current?.();
    }, Math.max(crossfadeMs, getSplashFadeMs()));
  }, [crossfadeMs]);

  // Kilépés ütemezése, amint tudjuk, melyik változat fut.
  useEffect(() => {
    if (!active || plan === undefined || exitingRef.current) return;

    const sinceMount = performance.now();
    // Bejelentkezési oldalon nincs mit "bemutatni" — rövid márkás villanás elég.
    const onAuthPage = window.location.pathname.startsWith("/auth");
    const displayMs = plan ? TRIP_INTRO_MS : onAuthPage ? AUTH_SPLASH_MS : getSplashDisplayMs();
    // A márkás splash a megnyitástól számít (a szerverre várás beleszámít).
    const remaining = plan ? displayMs : Math.max(0, displayMs - Math.min(sinceMount, displayMs));

    const timer = window.setTimeout(startExit, remaining);
    timersRef.current = [timer];
    return () => window.clearTimeout(timer);
  }, [active, plan, startExit]);

  useLayoutEffect(() => {
    if (!active) {
      if (document.body) {
        document.body.style.overflow = "";
        document.body.style.backgroundColor = "";
      }
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    html.classList.add("app-splash-active");
    html.classList.remove("app-splash-exiting");
    html.style.backgroundColor = SPLASH_BG;
    body.style.backgroundColor = SPLASH_BG;
    body.style.overflow = "hidden";

    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute("content") ?? null;
    if (themeMeta) {
      themeMeta.setAttribute("content", SPLASH_BG);
    }

    return () => {
      if (themeMeta && previousTheme) {
        themeMeta.setAttribute("content", previousTheme);
      }
    };
  }, [active]);

  if (active && plan) {
    return <TripIntro plan={plan} onSkip={startExit} />;
  }

  return null;
}
