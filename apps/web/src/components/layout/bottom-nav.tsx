"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText, Images, Map, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Calendar };

const left: NavItem[] = [
  { href: "/photos", label: "Fotók", icon: Images },
  { href: "/", label: "Naptár", icon: Calendar },
];
const center: NavItem = { href: "/trips", label: "Utazások", icon: Map };
const right: NavItem[] = [{ href: "/documents", label: "Iratok", icon: FileText }];

const slotClass =
  "relative flex h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 text-[0.62rem] font-medium tracking-wide transition-colors";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Slot({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(slotClass, active ? "text-primary dark:text-[var(--brand-accent)]" : "text-muted-foreground")}
    >
      <Icon className={cn("h-[1.35rem] w-[1.35rem] transition-transform", active && "-translate-y-0.5 scale-110")} />
      {item.label}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-1 h-1 rounded-full bg-[var(--brand-accent)] transition-all duration-300",
          active ? "w-4 opacity-100" : "w-0 opacity-0"
        )}
      />
    </Link>
  );
}

/** Lebegő üveg-dokk, középen kiemelt „Utazások” gombbal. A „Menü” az egyetlen belépés az oldalsávhoz. */
export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const CenterIcon = center.icon;
  const centerActive = isActive(pathname, center.href);

  return (
    <nav aria-label="Fő navigáció" className="relative z-30 shrink-0 px-3 pb-1.5 pt-1 md:hidden">
      <div className="relative flex items-end rounded-[1.75rem] border border-border/70 bg-[color-mix(in_oklab,var(--card)_85%,transparent)] px-1 shadow-[0_8px_30px_-8px_rgba(15,30,60,0.35)] backdrop-blur-xl dark:border-white/10 dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.7)]">
        {left.map((item) => (
          <Slot key={item.href} item={item} pathname={pathname} />
        ))}

        <Link
          href={center.href}
          aria-current={centerActive ? "page" : undefined}
          aria-label={center.label}
          className="relative flex h-14 flex-1 touch-manipulation flex-col items-center justify-end pb-1.5"
        >
          <span
            className={cn(
              "absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background shadow-lg transition-transform duration-300 active:scale-95",
              "bg-gradient-to-br from-[#ffb866] via-[#f0a050] to-[#d47a2e] text-[#1a2744]",
              centerActive && "scale-105 shadow-orange-500/40"
            )}
          >
            <CenterIcon className="h-6 w-6" />
          </span>
          <span
            className={cn(
              "text-[0.62rem] font-semibold tracking-wide",
              centerActive ? "text-primary dark:text-[var(--brand-accent)]" : "text-muted-foreground"
            )}
          >
            {center.label}
          </span>
        </Link>

        {right.map((item) => (
          <Slot key={item.href} item={item} pathname={pathname} />
        ))}

        <button type="button" onClick={onOpenMenu} aria-label="Menü megnyitása" className={cn(slotClass, "text-muted-foreground")}>
          <Menu className="h-[1.35rem] w-[1.35rem]" />
          Menü
        </button>
      </div>
    </nav>
  );
}
