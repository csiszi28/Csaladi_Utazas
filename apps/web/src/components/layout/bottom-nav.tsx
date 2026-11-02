"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText, Map, Menu, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Naptár", icon: Calendar },
  { href: "/trips", label: "Utazások", icon: Map },
  { href: "/family", label: "Család", icon: Users },
  { href: "/documents", label: "Iratok", icon: FileText },
] as const;

const itemClass =
  "relative flex min-h-[3.5rem] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[0.68rem] font-medium transition-colors";

/** Mobil alsó navigáció: a fő oldalak egy hüvelykujjnyira; a „Menü” a teljes oldalsávot nyitja. */
export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Fő navigáció"
      className="relative z-30 flex shrink-0 border-t bg-[color-mix(in_oklab,var(--card)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(itemClass, active ? "text-primary" : "text-muted-foreground")}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-[var(--brand-accent)]"
              />
            ) : null}
            <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        className={cn(itemClass, "text-muted-foreground")}
        aria-label="Menü megnyitása"
      >
        <Menu className="h-5 w-5" />
        Menü
      </button>
    </nav>
  );
}
