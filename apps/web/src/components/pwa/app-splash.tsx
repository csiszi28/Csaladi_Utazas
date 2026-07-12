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
} from "@/lib/app-splash";

interface AppSplashProps {
  crossfadeMs: number;
  onFadeStart?: () => void;
  onFinished?: () => void;
}

export function AppSplash({ crossfadeMs, onFadeStart, onFinished }: AppSplashProps) {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");
  const [introShown, setIntroShown] = useState(false);
  const onFadeStartRef = useRef(onFadeStart);
  const onFinishedRef = useRef(onFinished);
  const blockerHandoffRef = useRef(false);
  const enterMs = getSplashEnterMs();
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

  useLayoutEffect(() => {
    if (phase !== "visible") return;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIntroShown(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [phase]);

  useLayoutEffect(() => {
    if (!introShown || blockerHandoffRef.current) return;

    blockerHandoffRef.current = true;
    document.getElementById("app-splash-blocker")?.classList.add("app-splash-blocker--handoff");

    const timer = window.setTimeout(() => {
      document.getElementById("app-splash-blocker")?.remove();
    }, enterMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [introShown, enterMs]);

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

  if (phase === "hidden" || typeof document === "undefined") return null;

  const splash = (
    <div
      className={cn(
        "app-splash-root transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)]",
        phase === "fading" && "pointer-events-none opacity-0"
      )}
      style={{ transitionDuration: `${fadeMs}ms` }}
      role="presentation"
      aria-hidden={phase === "fading"}
    >
      <div
        className={cn("app-splash-content app-splash-intro", introShown && "app-splash-intro--shown")}
        style={{ "--splash-enter-ms": `${enterMs}ms` } as CSSProperties}
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
