"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { DesktopSidebar, MobileSidebarChrome, SidebarNav } from "@/components/layout/sidebar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ExchangeRatesProvider } from "@/components/exchange-rates-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { RemindersBell } from "@/components/reminders/reminders-bell";
import {
  CommandPalette,
  type CommandPaletteTrip,
} from "@/components/search/command-palette";
import type { CommandPaletteSearchItem } from "@/lib/queries/command-palette";

export function DashboardLayout({
  children,
  trips = [],
  searchItems = [],
}: {
  children: React.ReactNode;
  trips?: CommandPaletteTrip[];
  searchItems?: CommandPaletteSearchItem[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
  }, [pathname]);

  return (
    <ExchangeRatesProvider>
      <DashboardShell>
        <div className="app-canvas relative flex h-svh overflow-hidden">
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
              "sidebar-rail fixed top-0 left-0 z-50 flex h-svh flex-col overflow-hidden shadow-2xl shadow-black/40 transition-transform duration-200 contain-paint md:hidden",
              "pt-[env(safe-area-inset-top)]",
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
            style={{ width: "min(var(--app-sidebar-width), 88vw)" }}
          >
            <MobileSidebarChrome>
              <SidebarNav
                mobileDrawer
                showClose
                onClose={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
            </MobileSidebarChrome>
          </aside>

          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
            <main className="app-main-scroll min-h-0 flex-1">
              <div className="sticky top-0 z-20 flex items-center gap-2 bg-[color-mix(in_oklab,var(--background)_82%,transparent)] px-[var(--app-content-padding)] pt-[max(var(--app-content-padding),env(safe-area-inset-top))] pb-2 backdrop-blur-md md:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Menü megnyitása"
                  style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <span className="font-display text-base font-bold tracking-wide text-primary">
                    {BRAND.shortName}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Keresés"
                  style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
                >
                  <Search className="h-5 w-5" />
                </Button>
                <RemindersBell />
              </div>

              <div className="flex items-start gap-3 px-[var(--app-content-padding)] pb-[var(--app-content-padding)] pt-[var(--app-content-padding)]">
                <div className="min-w-0 flex-1">{children}</div>
                <div className="hidden shrink-0 md:block">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-9 gap-2 text-muted-foreground"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                    Keresés
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      Ctrl K
                    </kbd>
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>

        <CommandPalette
          trips={trips}
          searchItems={searchItems}
          open={searchOpen}
          onOpenChange={setSearchOpen}
        />
      </DashboardShell>
    </ExchangeRatesProvider>
  );
}
