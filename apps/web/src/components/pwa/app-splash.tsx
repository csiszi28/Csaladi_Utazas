"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  SPLASH_BG,
  beginSplashExit,
  cleanupSplashPrep,
  getSplashDisplayMs,
  getSplashFadeMs,
  markSplashSeen,
  shouldShowSplash,
  syncSplashDocumentState,
} from "@/lib/app-splash";

interface AppSplashProps {
  crossfadeMs: number;
  onFadeStart?: () => void;
  onFinished?: () => void;
}

/**
 * Csak időzítés és dokumentum-osztályok — a vizuális intro egyetlen rétege
 * a layout.tsx #app-splash-blocker (React portal nélkül, nincs dupla render).
 */
export function AppSplash({ crossfadeMs, onFadeStart, onFinished }: AppSplashProps) {
  const [active, setActive] = useState(false);
  const onFadeStartRef = useRef(onFadeStart);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFadeStartRef.current = onFadeStart;
    onFinishedRef.current = onFinished;
  }, [onFadeStart, onFinished]);

  useLayoutEffect(() => {
    if (!shouldShowSplash()) {
      onFinishedRef.current?.();
      return;
    }

    syncSplashDocumentState();
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active || !shouldShowSplash()) return;

    const displayMs = getSplashDisplayMs();
    const fadeDurationMs = getSplashFadeMs();

    const fadeTimer = window.setTimeout(() => {
      beginSplashExit();
      onFadeStartRef.current?.();
    }, displayMs);

    const hideTimer = window.setTimeout(() => {
      markSplashSeen();
      setActive(false);
      cleanupSplashPrep();
      onFinishedRef.current?.();
    }, displayMs + Math.max(crossfadeMs, fadeDurationMs));

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [active, crossfadeMs]);

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

  return null;
}
