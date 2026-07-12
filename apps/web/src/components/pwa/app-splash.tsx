"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  SPLASH_BG,
  beginSplashExit,
  cleanupSplashPrep,
  getSplashDisplayMs,
  getSplashFadeMs,
  markSplashSeen,
  shouldShowSplash,
} from "@/lib/app-splash";

interface AppSplashProps {
  onFadeStart?: () => void;
  onFinished?: () => void;
}

export function AppSplash({ onFadeStart, onFinished }: AppSplashProps) {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");
  const onFadeStartRef = useRef(onFadeStart);
  const onFinishedRef = useRef(onFinished);
  const splashReadyRef = useRef(false);
  const fadeMs = getSplashFadeMs();

  useEffect(() => {
    onFadeStartRef.current = onFadeStart;
    onFinishedRef.current = onFinished;
  }, [onFadeStart, onFinished]);

  useLayoutEffect(() => {
    if (!shouldShowSplash()) {
      cleanupSplashPrep();
      onFinishedRef.current?.();
      return;
    }

    setPhase("visible");
  }, []);

  useEffect(() => {
    if (!shouldShowSplash()) return;

    const displayMs = getSplashDisplayMs();
    const fadeDurationMs = getSplashFadeMs();

    const fadeTimer = window.setTimeout(() => {
      beginSplashExit();
      onFadeStartRef.current?.();
      setPhase("fading");
    }, displayMs);

    const hideTimer = window.setTimeout(() => {
      markSplashSeen();
      setPhase("hidden");
      cleanupSplashPrep();
      onFinishedRef.current?.();
    }, displayMs + fadeDurationMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useLayoutEffect(() => {
    if (phase === "hidden") return;

    const html = document.documentElement;
    const body = document.body;

    if (phase === "fading") {
      html.classList.remove("app-splash-active");
      html.classList.add("app-splash-exiting");
    } else {
      html.classList.add("app-splash-active");
      html.classList.remove("app-splash-exiting");
    }

    html.style.backgroundColor = SPLASH_BG;
    body.style.backgroundColor = SPLASH_BG;
    body.style.overflow = "hidden";

    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute("content") ?? null;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", SPLASH_BG);

    return () => {
      if (themeMeta) {
        if (previousTheme) themeMeta.setAttribute("content", previousTheme);
        else themeMeta.remove();
      }
    };
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "visible" || splashReadyRef.current) return;

    splashReadyRef.current = true;
    document.getElementById("app-splash-blocker")?.remove();
  }, [phase]);

  if (phase === "hidden" || typeof document === "undefined") return null;

  const splash = (
    <div className="app-splash-root" role="presentation" aria-hidden={phase === "fading"}>
      <div
        className={cn(
          "app-splash-content transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)]",
          phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        style={{ transitionDuration: `${fadeMs}ms` }}
      >
        <div className="app-splash-brand">
          <h1 className="app-splash-title">F.A.M.</h1>
          <p className="app-splash-subtitle">FAMILY ADVENTURE MANAGER</p>
        </div>

        <footer className="app-splash-footer">
          <span className="app-splash-connecting splash-connecting-pulse">Connecting...</span>
          <div className="app-splash-progress-track">
            <div className="app-splash-progress-shimmer-bar splash-progress-shimmer" />
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(splash, document.body);
}
