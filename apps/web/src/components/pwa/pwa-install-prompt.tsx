"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "pwa-install-dismissed-until";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isDismissedRecently() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIosHint, setIsIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIos && !ua.includes("crios") && !ua.includes("fxios");

    if (isSafari) {
      setIsIosHint(true);
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss(days = 7) {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[60] border-t bg-card p-4 shadow-lg",
        "pb-[max(1rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 space-y-1 pr-2">
          <p className="text-sm font-semibold">Telepítsd az alkalmazást</p>
          <p className="text-xs text-muted-foreground">
            {isIosHint
              ? "Safari: Megosztás → „Hozzáadás a kezdőképernyőhöz” — így appként nyithatod meg."
              : "Gyorsabb elérés a kezdőképernyőről, teljes képernyős nézetben."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!isIosHint && deferredPrompt && (
            <Button size="sm" className="min-h-[var(--touch-target)] flex-1 sm:min-h-9" onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" />
              Telepítés
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="min-h-[var(--touch-target)] sm:min-h-9"
            onClick={() => dismiss()}
            aria-label="Bezárás"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
