"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
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

  return (
    <QueryClientProvider client={queryClient}>
      <AppSplash />
      {children}
      <PwaRegister />
      <PwaInstallPrompt />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
