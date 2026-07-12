export const SPLASH_KEY = "app-splash-seen-v2";
export const SPLASH_BG = "#1a365d";

export const SPLASH_DISPLAY_MS = 8000;
export const SPLASH_FADE_MS = 700;

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

export function isSplashContentReady(): boolean {
  if (typeof window === "undefined") return true;
  return !shouldShowSplash();
}

export function cleanupSplashPrep(): void {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("app-splash-active");
  document.documentElement.style.backgroundColor = "";
  if (document.body) {
    document.body.style.backgroundColor = "";
    document.body.style.overflow = "";
  }
  document.getElementById("app-splash-prep-style")?.remove();
  document.getElementById("app-splash-blocker")?.remove();
}
