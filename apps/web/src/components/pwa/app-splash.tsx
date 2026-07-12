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

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("app-splash-blocker")?.remove();
      });
    });
  }, [phase]);

  if (phase === "hidden" || typeof document === "undefined") return null;

  const splash = (
    <div className="app-splash-root" role="presentation" aria-hidden={phase === "fading"}>
      <div
        className={cn(
          "app-splash-content flex h-full w-full flex-col text-white transition-[opacity,transform] ease-[cubic-bezier(0.4,0,0.2,1)]",
          phase === "fading"
            ? "pointer-events-none scale-[1.015] opacity-0"
            : "scale-100 opacity-100"
        )}
        style={{ transitionDuration: `${fadeMs}ms` }}
      >
        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center space-y-6 text-center">
            <h1 className="text-4xl font-bold tracking-[0.35em] text-white drop-shadow-sm sm:text-5xl">
              F.A.M.
            </h1>
            <p className="text-sm font-semibold tracking-[0.28em] text-[#d6e3ff]/90">
              FAMILY ADVENTURE MANAGER
            </p>
          </div>
        </main>

        <footer
          className="splash-reveal-up relative flex w-full max-w-md shrink-0 flex-col items-center space-y-3 self-center px-4 pb-6"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="animate-pulse text-sm font-semibold tracking-wide text-[#adc7f7]">
            Connecting...
          </span>
          <div className="relative h-0.5 w-48 overflow-hidden rounded-full bg-white/25">
            <div className="splash-progress-shimmer absolute inset-y-0 w-1/3 rounded-full bg-[#ffb866]" />
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(splash, document.body);
}
