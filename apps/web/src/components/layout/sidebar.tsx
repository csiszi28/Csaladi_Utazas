"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, Map, Users, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Naptár", icon: Calendar },
  { href: "/trips", label: "Utazások", icon: Map },
  { href: "/family", label: "Család", icon: Users },
  { href: "/dashboard", label: "Kimutatások", icon: LayoutDashboard },
];

interface SidebarNavProps {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}

export function SidebarNav({ onNavigate, showClose, onClose }: SidebarNavProps) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  return (
    <>
      <div
        className="flex items-center justify-between border-b px-[var(--app-content-padding)]"
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
      <nav className="flex-1 space-y-1 p-[var(--app-content-padding)]">
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
                "flex items-center gap-3 rounded-lg px-3 font-medium transition-colors",
                "text-sm min-h-[var(--touch-target)]",
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
      </nav>
      <div className="border-t p-[var(--app-content-padding)]">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[var(--touch-target)]"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Kijelentkezés
        </Button>
      </div>
    </>
  );
}

export function DesktopSidebar() {
  return (
    <aside
      className="hidden min-h-screen shrink-0 flex-col border-r bg-card md:flex"
      style={{ width: "var(--app-sidebar-width)" }}
    >
      <SidebarNav />
    </aside>
  );
}
