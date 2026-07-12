"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { shouldShowSplash } from "@/lib/app-splash";
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

  const [contentReady, setContentReady] = useState(false);
  const handleSplashFinished = useCallback(() => setContentReady(true), []);

  useEffect(() => {
    if (!shouldShowSplash()) {
      setContentReady(true);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppSplash onFinished={handleSplashFinished} />
      {contentReady ? children : null}
      <PwaRegister />
      <PwaInstallPrompt />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
