"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const SPLASH_KEY = "app-splash-seen";
const DISPLAY_MS = 5000;
const FADE_MS = 700;

export function AppSplash() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);

    if (!isMobile && !isStandalone) return;
    if (sessionStorage.getItem(SPLASH_KEY) === "1") return;

    sessionStorage.setItem(SPLASH_KEY, "1");
    setPhase("visible");

    const fadeTimer = window.setTimeout(() => setPhase("fading"), DISPLAY_MS);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), DISPLAY_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === "hidden") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  if (phase === "hidden" || !mounted) return null;

  const splash = (
    <div
      className={cn(
        "app-splash-bg fixed z-[9999] flex flex-col text-white transition-all duration-700 ease-in-out",
        phase === "fading" ? "pointer-events-none scale-[0.98] opacity-0" : "scale-100 opacity-100"
      )}
      aria-hidden={phase === "fading"}
      role="presentation"
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
        className="splash-reveal-up relative flex w-full max-w-md shrink-0 flex-col items-center space-y-3 self-center px-4"
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
  );

  return createPortal(splash, document.body);
}
