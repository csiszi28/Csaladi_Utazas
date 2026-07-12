"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  SPLASH_BG,
  beginSplashExit,
  cleanupSplashPrep,
  getSplashDisplayMs,
  getSplashEnterMs,
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

export function AppSplash({ crossfadeMs, onFadeStart, onFinished }: AppSplashProps) {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");
  const [enterVisible, setEnterVisible] = useState(false);
  const onFadeStartRef = useRef(onFadeStart);
  const onFinishedRef = useRef(onFinished);
  const enterMs = getSplashEnterMs();
  const fadeMs = getSplashFadeMs();

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
    setPhase("visible");
  }, []);

  useLayoutEffect(() => {
    if (phase !== "visible") return;

    const frame = window.requestAnimationFrame(() => {
      setEnterVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [phase]);

  useLayoutEffect(() => {
    if (!enterVisible) return;

    document.documentElement.classList.add("app-splash-entered");

    return () => {
      document.documentElement.classList.remove("app-splash-entered");
    };
  }, [enterVisible]);

  useEffect(() => {
    if (!shouldShowSplash()) return;

    const displayMs = getSplashDisplayMs();

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
    }, displayMs + crossfadeMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [crossfadeMs]);

  useLayoutEffect(() => {
    if (phase === "hidden") {
      if (document.body) {
        document.body.style.overflow = "";
        document.body.style.backgroundColor = "";
      }
      return;
    }

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

  if (phase === "hidden" || typeof document === "undefined") return null;

  const splash = (
    <div
      className={cn(
        "app-splash-root app-splash-root--enter ease-[cubic-bezier(0.22,1,0.36,1)]",
        enterVisible && "app-splash-root--enter-visible",
        phase === "fading" && "app-splash-root--exit pointer-events-none"
      )}
      style={
        {
          "--splash-enter-ms": `${enterMs}ms`,
          "--splash-fade-ms": `${fadeMs}ms`,
        } as CSSProperties
      }
      role="presentation"
      aria-hidden={phase === "fading"}
    >
      <div className="app-splash-stage">
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
