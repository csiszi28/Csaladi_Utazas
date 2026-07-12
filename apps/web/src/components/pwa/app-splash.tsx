"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  SPLASH_BG,
  SPLASH_DISPLAY_MS,
  SPLASH_FADE_MS,
  cleanupSplashPrep,
  markSplashSeen,
  shouldShowSplash,
} from "@/lib/app-splash";

interface AppSplashProps {
  onFinished?: () => void;
}

function getInitialPhase(): "hidden" | "visible" | "fading" {
  if (typeof window === "undefined") return "hidden";
  return shouldShowSplash() ? "visible" : "hidden";
}

export function AppSplash({ onFinished }: AppSplashProps) {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">(getInitialPhase);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (!shouldShowSplash()) {
      cleanupSplashPrep();
      onFinishedRef.current?.();
      return;
    }

    document.getElementById("app-splash-blocker")?.remove();
    setPhase("visible");

    const fadeTimer = window.setTimeout(() => setPhase("fading"), SPLASH_DISPLAY_MS);
    const hideTimer = window.setTimeout(() => {
      markSplashSeen();
      setPhase("hidden");
      cleanupSplashPrep();
      onFinishedRef.current?.();
    }, SPLASH_DISPLAY_MS + SPLASH_FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === "hidden") return;

    const html = document.documentElement;
    const body = document.body;

    html.classList.add("app-splash-active");
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
    <div className="app-splash-root" role="presentation" aria-hidden={phase === "fading"}>
      <div
        className={cn(
          "app-splash-content flex h-full w-full flex-col text-white transition-opacity duration-700 ease-out",
          phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4">
          <div
            className="splash-reveal-up flex flex-col items-center space-y-6 text-center"
            style={{ animationDelay: "0s" }}
          >
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
