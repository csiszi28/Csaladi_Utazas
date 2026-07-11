"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText, LayoutDashboard, Map, Users, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Naptár", icon: Calendar },
  { href: "/trips", label: "Utazások", icon: Map },
  { href: "/documents", label: "Dokumentumok", icon: FileText },
  { href: "/family", label: "Család", icon: Users },
  { href: "/dashboard", label: "Kimutatások", icon: LayoutDashboard },
];

interface SidebarNavProps {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  /** Mobil drawer: kijelentkezés a görgethető menüben, nem a sarokban */
  mobileDrawer?: boolean;
}

export function SidebarNav({ onNavigate, showClose, onClose, mobileDrawer }: SidebarNavProps) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  const logoutButton = (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 text-muted-foreground hover:text-destructive",
        mobileDrawer ? "min-h-[var(--touch-target)]" : "min-h-[var(--touch-target)]"
      )}
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Kijelentkezés
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 items-center justify-between border-b px-[var(--app-content-padding)]"
        style={{ minHeight: "var(--app-header-height)" }}
      >
        <h1 className="text-base font-bold text-primary sm:text-lg">Családi Utazás</h1>
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
                "flex items-center gap-3 rounded-lg px-3 font-medium transition-colors touch-manipulation",
                "text-sm min-h-[var(--touch-target)]",
                "active:scale-[0.98] active:opacity-90",
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

        {mobileDrawer ? (
          <div className="mt-4 border-t pt-4">{logoutButton}</div>
        ) : null}
      </nav>

      {!mobileDrawer ? (
        <div className="shrink-0 border-t p-[var(--app-content-padding)]">{logoutButton}</div>
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
