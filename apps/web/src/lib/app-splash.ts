export const SPLASH_KEY = "app-splash-seen-v3";
export const SPLASH_BG = "#1a365d";

/** Márkás tartalék splash (nincs közelgő út): 3 másodperc a megnyitástól. */
export const SPLASH_DISPLAY_MS = 3000;
export const SPLASH_ENTER_MS = 400;
export const SPLASH_FADE_MS = 700;
export const SPLASH_CONTENT_FADE_MS = 600;

/** Ennyit várunk a szerverre, ha még nincs gyorsítótárazott úti adat. */
export const SPLASH_FETCH_BUDGET_MS = 1800;

/** Egy munkamenetben egyszer, minden eszközön. */
export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return sessionStorage.getItem(SPLASH_KEY) !== "1";
  } catch {
    return true;
  }
}

/** Belépés után újra lejátszható legyen a nyitóanimáció. */
export function resetSplashSeen(): void {
  try {
    sessionStorage.removeItem(SPLASH_KEY);
  } catch {
    // storage blocked
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

  document.documentElement.classList.remove("app-splash-active", "app-splash-exiting", "intro-pending");
  document.documentElement.classList.add("app-ready");
  document.documentElement.style.backgroundColor = "";
  if (document.body) {
    document.body.style.backgroundColor = "";
    document.body.style.overflow = "";
  }
}

/** Navigáció / bejelentkezés előtt: biztosítja, hogy az app interaktív állapotban legyen. */
export function ensureAppInteractive(): void {
  cleanupSplashPrep();
}
