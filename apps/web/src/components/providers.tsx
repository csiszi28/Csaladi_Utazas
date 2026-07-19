"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import {
  ensureAppInteractive,
  getSplashContentFadeMs,
  getSplashCrossfadeMs,
  shouldShowSplash,
  syncSplashDocumentState,
} from "@/lib/app-splash";
import { AppToaster } from "@/components/ui/app-toaster";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { AppSplash } from "@/components/pwa/app-splash";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [splashActive, setSplashActive] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const handleSplashFadeStart = useCallback(() => {
    window.requestAnimationFrame(() => {
      setContentVisible(true);
    });
  }, []);

  const handleSplashFinished = useCallback(() => {
    ensureAppInteractive();
    setContentVisible(true);
    setSplashActive(false);
  }, []);

  useLayoutEffect(() => {
    const showSplash = syncSplashDocumentState();
    setSplashActive(showSplash);

    if (!showSplash) {
      ensureAppInteractive();
      setContentVisible(true);
    }
  }, []);

  useEffect(() => {
    if (shouldShowSplash()) return;

    ensureAppInteractive();
    setSplashActive(false);
    setContentVisible(true);
  }, [pathname]);

  const showAppShell = !splashActive || contentVisible;
  const contentFadeMs = getSplashContentFadeMs();
  const crossfadeMs = getSplashCrossfadeMs();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppSplash
          crossfadeMs={crossfadeMs}
          onFadeStart={handleSplashFadeStart}
          onFinished={handleSplashFinished}
        />
        <div
          id="app-root"
          suppressHydrationWarning
          className={
            splashActive
              ? showAppShell
                ? "app-content-enter app-content-enter--visible"
                : "app-content-enter"
              : undefined
          }
          style={
            splashActive
              ? ({ "--app-content-fade-ms": `${contentFadeMs}ms` } as CSSProperties)
              : undefined
          }
        >
          {children}
        </div>
        <div id="app-chrome" suppressHydrationWarning>
          <PwaRegister />
          <PwaInstallPrompt />
          <AppToaster />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
