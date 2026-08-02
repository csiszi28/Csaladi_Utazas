"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  Images,
  LayoutDashboard,
  Map,
  Users,
  LogOut,
  X,
  Moon,
  Palette,
  Sun,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { useTheme } from "@/components/theme-provider";
import { RemindersBell } from "@/components/reminders/reminders-bell";
import { OfflineDaysNav } from "@/components/layout/offline-days-nav";

const navItems = [
  { href: "/", label: "Naptár", icon: Calendar },
  { href: "/trips", label: "Utazások", icon: Map },
  { href: "/documents", label: "Dokumentumok", icon: FileText },
  { href: "/photos", label: "Fotók", icon: Images },
  { href: "/family", label: "Család", icon: Users },
  { href: "/dashboard", label: "Kimutatások", icon: LayoutDashboard },
];

const navItemClass = cn(
  "group relative flex w-full items-center gap-3 rounded-2xl px-2.5 font-medium transition-colors duration-200 touch-manipulation",
  "text-sm min-h-[var(--touch-target)]"
);

interface SidebarNavProps {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  /** Mobil drawer: kijelentkezés a görgethető menüben, nem a sarokban */
  mobileDrawer?: boolean;
}

function AppearanceNavItem() {
  const { resolved, toggleLightDark } = useTheme();
  const isDark = resolved === "dark";
  const label = isDark ? "Világos mód" : "Sötét mód";

  return (
    <button
      type="button"
      onClick={toggleLightDark}
      aria-label={label}
      title={label}
      className={cn(
        navItemClass,
        "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
        "dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground ring-1 ring-border transition-[color,background-color] duration-200 group-hover:bg-background group-hover:text-foreground dark:bg-white/8 dark:text-white/70 dark:ring-white/10 dark:group-hover:bg-white/12 dark:group-hover:text-white">
        <Palette className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">Megjelenés</span>
      <span
        aria-hidden
        className="relative mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 group-hover:text-foreground dark:text-[var(--brand-accent)] dark:group-hover:text-[var(--brand-accent)]"
      >
        <Sun
          className={cn(
            "absolute h-4 w-4 transition-[opacity,transform] duration-300 ease-out",
            isDark ? "scale-100 opacity-100" : "scale-75 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 transition-[opacity,transform] duration-300 ease-out",
            isDark ? "scale-75 opacity-0" : "scale-100 opacity-100"
          )}
        />
      </span>
    </button>
  );
}

export function SidebarNav({ onNavigate, showClose, onClose, mobileDrawer }: SidebarNavProps) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  const footerItems = (
    <>
      <AppearanceNavItem />
      <Link
        href="/settings"
        onClick={onNavigate}
        className={cn(
          navItemClass,
          pathname === "/settings" || pathname.startsWith("/settings/")
            ? "sidebar-nav-active bg-primary text-primary-foreground dark:bg-white/12 dark:text-white"
            : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
            pathname === "/settings" || pathname.startsWith("/settings/")
              ? "bg-[var(--brand-accent)] text-[#1a2744]"
              : "bg-muted/70 text-muted-foreground ring-1 ring-border group-hover:bg-background group-hover:text-foreground dark:bg-white/8 dark:text-white/70 dark:ring-white/10 dark:group-hover:bg-white/12 dark:group-hover:text-white"
          )}
        >
          <Settings className="h-4 w-4" />
        </span>
        Beállítások
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          navItemClass,
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          "dark:text-white/55 dark:hover:bg-rose-500/15 dark:hover:text-rose-200"
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground ring-1 ring-border transition-colors group-hover:bg-destructive/10 group-hover:text-destructive dark:bg-white/8 dark:text-white/70 dark:ring-white/10 dark:group-hover:bg-rose-500/20 dark:group-hover:text-rose-100 dark:group-hover:ring-rose-300/20">
          <LogOut className="h-4 w-4" />
        </span>
        Kijelentkezés
      </button>
    </>
  );

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      <div
        className="relative shrink-0 px-[var(--app-content-padding)]"
        style={{ minHeight: "var(--app-header-height)" }}
      >
        <div className="relative flex h-full items-center justify-between gap-2 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="sidebar-brand-mark relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#ffb866] via-[#f0a050] to-[#d47a2e] shadow-lg shadow-orange-500/25">
              <span className="font-display text-sm font-bold tracking-wide text-[#1a2744]">
                FAM
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.45)_0%,transparent_45%)]"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold tracking-[0.22em] text-primary dark:text-white sm:text-lg">
                {BRAND.shortName}
              </h1>
              <p className="mt-0.5 truncate text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground dark:text-sky-100/70">
                {BRAND.taglineHu}
              </p>
            </div>
          </div>
          {showClose && onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
              style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
              onClick={onClose}
              aria-label="Menü bezárása"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div
          aria-hidden
          className="h-px w-full bg-border dark:bg-gradient-to-r dark:from-transparent dark:via-[rgba(255,184,102,0.45)] dark:to-transparent"
        />
      </div>

      <nav
        className={cn(
          "relative flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto px-[var(--app-content-padding)] py-4 [scrollbar-gutter:stable]",
          mobileDrawer && "pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
        <p className="mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 dark:text-sky-100/65">
          Menü
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                navItemClass,
                isActive
                  ? "sidebar-nav-active bg-primary text-primary-foreground dark:bg-white/12 dark:text-white"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white"
              )}
            >
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[var(--brand-accent)]"
                />
              ) : null}
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
                  isActive
                    ? "bg-[var(--brand-accent)] text-[#1a2744]"
                    : "bg-muted/70 text-muted-foreground ring-1 ring-border group-hover:bg-background group-hover:text-foreground dark:bg-white/8 dark:text-sky-100/80 dark:ring-white/10 dark:group-hover:bg-white/12 dark:group-hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">{item.label}</span>
              {isActive ? (
                <span
                  aria-hidden
                  className="mr-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]"
                />
              ) : null}
            </Link>
          );
        })}

        {!mobileDrawer ? (
          <div className="pt-2">
            <RemindersBell variant="nav" />
          </div>
        ) : null}

        <div className="pt-3">
          <OfflineDaysNav onNavigate={onNavigate} compact />
        </div>

        {mobileDrawer ? (
          <div className="mt-5 space-y-1.5 pt-4">
            <div
              aria-hidden
              className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent dark:via-[rgba(255,184,102,0.35)]"
            />
            {footerItems}
          </div>
        ) : null}
      </nav>

      {!mobileDrawer ? (
        <div className="relative shrink-0 space-y-1.5 px-[var(--app-content-padding)] pb-3 pt-1">
          <div aria-hidden className="mb-2 flex items-center gap-2 px-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border dark:to-[rgba(255,184,102,0.28)]" />
            <span className="h-1 w-1 shrink-0 rounded-full bg-border dark:bg-[rgba(255,184,102,0.55)]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border dark:to-[rgba(255,184,102,0.28)]" />
          </div>
          {footerItems}
        </div>
      ) : null}
    </div>
  );
}

function SidebarChrome({
  children,
  /** Desktop rail sits on app-canvas — in dark mode inherit the shared navy surface */
  inheritCanvas = false,
}: {
  children: React.ReactNode;
  inheritCanvas?: boolean;
}) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-card",
          inheritCanvas
            ? "dark:bg-transparent"
            : "dark:bg-gradient-to-b dark:from-[#002045] dark:via-[#14345f] dark:to-[#0b1e38]"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "sidebar-rail-glow pointer-events-none absolute -left-10 top-16 hidden h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,184,102,0.28),transparent_68%)] dark:block",
          inheritCanvas && "dark:hidden"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "sidebar-rail-glow-2 pointer-events-none absolute -right-16 bottom-24 hidden h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(90,160,255,0.22),transparent_70%)] dark:block",
          inheritCanvas && "dark:hidden"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 hidden opacity-[0.09] dark:block",
          inheritCanvas && "dark:hidden"
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border dark:bg-gradient-to-b dark:from-[rgba(255,184,102,0.35)] dark:via-sky-200/35 dark:to-[rgba(255,184,102,0.2)]"
      />
      {children}
    </>
  );
}

export function DesktopSidebar() {
  return (
    <aside
      className="sidebar-rail relative z-[2] hidden h-full shrink-0 flex-col overflow-hidden border-r border-border/80 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.35)] contain-paint dark:border-sky-200/20 dark:shadow-[6px_0_28px_-8px_rgba(0,0,0,0.55)] md:flex"
      style={{ width: "var(--app-sidebar-width)" }}
    >
      <SidebarChrome>
        <SidebarNav />
      </SidebarChrome>
    </aside>
  );
}

export function MobileSidebarChrome({ children }: { children: React.ReactNode }) {
  return <SidebarChrome>{children}</SidebarChrome>;
}
