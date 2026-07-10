"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { DesktopSidebar, SidebarNav } from "@/components/layout/sidebar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ExchangeRatesProvider } from "@/components/exchange-rates-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [children]);

  return (
    <ExchangeRatesProvider>
      <DashboardShell>
        <div className="flex min-h-[100dvh] bg-background">
          <DesktopSidebar />

          {mobileOpen && (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-label="Menü bezárása"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card shadow-xl transition-transform duration-200 md:hidden",
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
            style={{ width: "min(var(--app-sidebar-width), 88vw)" }}
          >
            <SidebarNav
              showClose
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-auto">
              <div
                className="sticky top-0 z-20 flex items-center gap-3 bg-background px-[var(--app-content-padding)] pt-[max(var(--app-content-padding),env(safe-area-inset-top))] pb-2 md:hidden"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Menü megnyitása"
                  style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <span className="text-base font-bold text-primary">Családi Utazás</span>
              </div>
              <div className="px-[var(--app-content-padding)] pb-[var(--app-content-padding)] md:p-[var(--app-content-padding)]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </DashboardShell>
    </ExchangeRatesProvider>
  );
}
