export const SPLASH_KEY = "app-splash-seen-v3";
export const SPLASH_BG = "#1a365d";

/** Márkás tartalék splash (nincs közelgő út): 3 másodperc a megnyitástól. */
export const SPLASH_DISPLAY_MS = 3000;
export const SPLASH_ENTER_MS = 400;
export const SPLASH_FADE_MS = 700;
export const SPLASH_CONTENT_FADE_MS = 600;

/** Ennyit várunk a szerverre, ha még nincs gyorsítótárazott úti adat. */
export const SPLASH_FETCH_BUDGET_MS = 1800;

/**
 * Utolsó aktív pillanat. iOS-en a háttérbe tett (felhúzott) app oldala eldobódhat, és a
 * sessionStorage elvész — ilyenkor ez különbözteti meg a visszatérést a valódi újraindítástól.
 * Keep in sync with the boot script in app/layout.tsx.
 */
export const LAST_ACTIVE_KEY = "app-last-active-v1";
/** Ennyi időn belüli visszatérés "folytatás", nem új megnyitás. */
export const RESUME_WINDOW_MS = 30 * 60 * 1000;

function wasRecentlyActive(): boolean {
  try {
    const at = Number(localStorage.getItem(LAST_ACTIVE_KEY));
    return at > 0 && Date.now() - at >= 0 && Date.now() - at < RESUME_WINDOW_MS;
  } catch {
    return false;
  }
}

export function touchLastActive(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // storage blocked
  }
}

/** Csak az első megnyitáskor / bezárás utáni indításkor; háttérből visszatérve nem. */
export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (sessionStorage.getItem(SPLASH_KEY) === "1") return false;
  } catch {
    return !wasRecentlyActive();
  }

  if (wasRecentlyActive()) {
    markSplashSeen();
    return false;
  }
  return true;
}

/** Amíg az app nyitva van, folyamatosan frissíti az "utolsó aktív" időbélyeget. */
export function startActivityTracking(): () => void {
  // A nyitó animáció alatt még nem számít "megnyitottnak" (különben a splash félbeszakadna)
  const touchIfSeen = () => {
    try {
      if (sessionStorage.getItem(SPLASH_KEY) === "1") touchLastActive();
    } catch {
      touchLastActive();
    }
  };
  const onHide = touchIfSeen;
  const onVisibility = touchIfSeen;
  const interval = window.setInterval(() => {
    if (document.visibilityState === "visible") touchIfSeen();
  }, 60_000);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onHide);
  };
}

/** Belépés után újra lejátszható legyen a nyitóanimáció. */
export function resetSplashSeen(): void {
  try {
    sessionStorage.removeItem(SPLASH_KEY);
  } catch {
    // storage blocked
  }
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
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
  touchLastActive();
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
