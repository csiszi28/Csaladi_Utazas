"use client";

import { useEffect, useState } from "react";
import { Map } from "lucide-react";
import { cn } from "@/lib/utils";

const SPLASH_KEY = "app-splash-seen";
const DISPLAY_MS = 3200;
const FADE_MS = 450;

export function AppSplash() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

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

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-primary-foreground transition-opacity duration-[450ms] ease-out",
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-hidden={phase === "fading"}
    >
      <div className="flex flex-col items-center gap-4 px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
          <Map className="h-10 w-10" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight">Családi Utazás</p>
          <p className="text-sm text-primary-foreground/80">Utazások egy helyen</p>
        </div>
      </div>
    </div>
  );
}
