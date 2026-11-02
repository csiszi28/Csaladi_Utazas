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
  "group flex h-[3.25rem] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium tracking-wide transition-colors";

function Pill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground group-active:bg-muted"
      )}
    >
      {children}
    </span>
  );
}

/** Mobil alsó navigáció: a „Menü” a teljes oldalsávot nyitja (ez az egyetlen belépési pont). */
export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  return (
    // A home-indikátor sávjának csak a töredékét hagyjuk ki, így a sáv lejjebb ül
    <nav
      aria-label="Fő navigáció"
      className="relative z-30 flex shrink-0 border-t border-border/60 bg-[color-mix(in_oklab,var(--card)_88%,transparent)] pt-1.5 pb-[calc(env(safe-area-inset-bottom)*0.35)] backdrop-blur-xl md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(itemClass, active ? "text-foreground" : "text-muted-foreground")}
          >
            <Pill active={active}>
              <Icon className="h-[1.15rem] w-[1.15rem]" />
            </Pill>
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
        <Pill active={false}>
          <Menu className="h-[1.15rem] w-[1.15rem]" />
        </Pill>
        Menü
      </button>
    </nav>
  );
}
