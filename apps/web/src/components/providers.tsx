"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useState, type CSSProperties } from "react";
import { Toaster } from "sonner";
import { getSplashContentFadeMs, shouldShowSplash } from "@/lib/app-splash";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { AppSplash } from "@/components/pwa/app-splash";

export function Providers({ children }: { children: React.ReactNode }) {
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

  const [contentVisible, setContentVisible] = useState(false);
  const [useEnterTransition, setUseEnterTransition] = useState(false);

  const handleSplashFadeStart = useCallback(() => {
    setUseEnterTransition(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setContentVisible(true));
    });
  }, []);

  const handleSplashFinished = useCallback(() => {
    setContentVisible(true);
  }, []);

  useLayoutEffect(() => {
    if (!shouldShowSplash()) {
      setContentVisible(true);
    }
  }, []);

  const showAppShell = !useEnterTransition || contentVisible;
  const contentFadeMs = getSplashContentFadeMs();

  return (
    <QueryClientProvider client={queryClient}>
      <AppSplash onFadeStart={handleSplashFadeStart} onFinished={handleSplashFinished} />
      <div
        id="app-root"
        className={
          useEnterTransition
            ? showAppShell
              ? "app-content-enter app-content-enter--visible"
              : "app-content-enter"
            : undefined
        }
        style={
          useEnterTransition
            ? ({ "--app-content-fade-ms": `${contentFadeMs}ms` } as CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
      <PwaRegister />
      <PwaInstallPrompt />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
