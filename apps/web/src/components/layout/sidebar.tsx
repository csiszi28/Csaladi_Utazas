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
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { RemindersBell } from "@/components/reminders/reminders-bell";

const navItems = [
  { href: "/", label: "Naptár", icon: Calendar },
  { href: "/trips", label: "Utazások", icon: Map },
  { href: "/documents", label: "Dokumentumok", icon: FileText },
  { href: "/photos", label: "Fotók", icon: Images },
  { href: "/family", label: "Család", icon: Users },
  { href: "/dashboard", label: "Kimutatások", icon: LayoutDashboard },
];

const navItemClass = cn(
  "flex w-full items-center gap-3 rounded-lg px-3 font-medium transition-colors touch-manipulation",
  "text-sm min-h-[var(--touch-target)]",
  "active:scale-[0.98] active:opacity-90"
);

interface SidebarNavProps {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  /** Mobil drawer: kijelentkezés a görgethető menüben, nem a sarokban */
  mobileDrawer?: boolean;
}

function AppearanceNavItem() {
  return (
    <div className={cn(navItemClass, "text-muted-foreground")}>
      <Palette className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">Megjelenés</span>
      <ThemeToggle className="-mr-1.5 shrink-0" />
    </div>
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
      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          navItemClass,
          "text-muted-foreground hover:bg-accent hover:text-destructive"
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Kijelentkezés
      </button>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 items-center justify-between border-b px-[var(--app-content-padding)]"
        style={{ minHeight: "var(--app-header-height)" }}
      >
        <div className="min-w-0">
          <h1 className="font-display text-base font-bold tracking-wide text-primary sm:text-lg">
            {BRAND.shortName}
          </h1>
          <p className="truncate text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
            {BRAND.taglineHu}
          </p>
        </div>
        {showClose && onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
            onClick={onClose}
            aria-label="Menü bezárása"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto p-[var(--app-content-padding)]",
          mobileDrawer && "pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
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
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {!mobileDrawer ? <RemindersBell variant="nav" /> : null}

        {mobileDrawer ? (
          <div className="mt-4 space-y-1 border-t pt-4">{footerItems}</div>
        ) : null}
      </nav>

      {!mobileDrawer ? (
        <div className="shrink-0 space-y-1 border-t p-[var(--app-content-padding)]">{footerItems}</div>
      ) : null}
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside
      className="hidden h-full shrink-0 flex-col overflow-hidden border-r bg-card md:flex"
      style={{ width: "var(--app-sidebar-width)" }}
    >
      <SidebarNav />
    </aside>
  );
}
