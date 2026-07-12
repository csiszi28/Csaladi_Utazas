export const SPLASH_KEY = "app-splash-seen-v2";
export const SPLASH_BG = "#1a365d";

export const SPLASH_DISPLAY_MS = 8000;
export const SPLASH_ENTER_MS = 1000;
export const SPLASH_FADE_MS = 1400;
export const SPLASH_CONTENT_FADE_MS = 1400;

export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);

  if (!isMobile && !isStandalone) return false;

  try {
    return sessionStorage.getItem(SPLASH_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_KEY, "1");
  } catch {
    // storage blocked
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getSplashDisplayMs(): number {
  return prefersReducedMotion() ? 1200 : SPLASH_DISPLAY_MS;
}

export function getSplashEnterMs(): number {
  return prefersReducedMotion() ? 200 : SPLASH_ENTER_MS;
}

export function getSplashFadeMs(): number {
  return prefersReducedMotion() ? 200 : SPLASH_FADE_MS;
}

export function getSplashContentFadeMs(): number {
  return prefersReducedMotion() ? 200 : SPLASH_CONTENT_FADE_MS;
}

export function getSplashCrossfadeMs(): number {
  return Math.max(getSplashFadeMs(), getSplashContentFadeMs());
}

/** Szinkronban visszaállítja a dokumentum splash állapotát (hidratálás után azonnal). */
export function syncSplashDocumentState(): boolean {
  if (typeof document === "undefined") return false;

  const html = document.documentElement;

  if (!shouldShowSplash()) {
    cleanupSplashPrep();
    return false;
  }

  html.classList.remove("app-ready");
  html.classList.add("app-splash-active");
  html.classList.remove("app-splash-exiting");
  return true;
}

export function beginSplashExit(): void {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("app-splash-active");
  document.documentElement.classList.add("app-splash-exiting");
}

export function cleanupSplashPrep(): void {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("app-splash-active", "app-splash-exiting", "app-splash-entered");
  document.documentElement.classList.add("app-ready");
  document.documentElement.style.backgroundColor = "";
  if (document.body) {
    document.body.style.backgroundColor = "";
    document.body.style.overflow = "";
  }
  document.getElementById("app-splash-blocker")?.remove();
}

/** Navigáció / bejelentkezés előtt: biztosítja, hogy az app interaktív állapotban legyen. */
export function ensureAppInteractive(): void {
  cleanupSplashPrep();
}
