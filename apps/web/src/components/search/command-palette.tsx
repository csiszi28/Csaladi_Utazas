"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  Images,
  LayoutDashboard,
  Map as MapIcon,
  Search,
  Settings,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { readOfflineDaySnapshots } from "@/lib/offline-snapshots";

export interface CommandPaletteTrip {
  id: string;
  title: string;
  destination: string;
}

interface CommandPaletteProps {
  trips?: CommandPaletteTrip[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
  keywords?: string;
  icon: React.ReactNode;
};

const NAV_COMMANDS: CommandItem[] = [
  {
    id: "nav-calendar",
    label: "Naptár",
    href: "/",
    group: "Navigáció",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "nav-trips",
    label: "Utazások",
    href: "/trips",
    group: "Navigáció",
    icon: <MapIcon className="h-4 w-4" />,
  },
  {
    id: "nav-documents",
    label: "Dokumentumok",
    href: "/documents",
    group: "Navigáció",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "nav-photos",
    label: "Fotók",
    href: "/photos",
    group: "Navigáció",
    icon: <Images className="h-4 w-4" />,
  },
  {
    id: "nav-family",
    label: "Család",
    href: "/family",
    group: "Navigáció",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "nav-reports",
    label: "Kimutatások",
    href: "/dashboard",
    group: "Navigáció",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: "nav-settings",
    label: "Beállítások",
    href: "/settings",
    group: "Navigáció",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: "nav-offline",
    label: "Offline napok",
    href: "/~offline",
    group: "Navigáció",
    icon: <WifiOff className="h-4 w-4" />,
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function CommandPalette({ trips = [], open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    setOfflineCount(readOfflineDaySnapshots().length);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  const items = useMemo(() => {
    const tripItems: CommandItem[] = trips.map((trip) => ({
      id: `trip-${trip.id}`,
      label: trip.title,
      hint: trip.destination,
      href: `/trips/${trip.id}`,
      group: "Utazások",
      keywords: `${trip.title} ${trip.destination}`,
      icon: <MapIcon className="h-4 w-4" />,
    }));

    const offlineHint =
      offlineCount > 0
        ? `${offlineCount} mentett nap`
        : "Nincs mentett nap";

    const all = [
      ...NAV_COMMANDS.map((item) =>
        item.id === "nav-offline" ? { ...item, hint: offlineHint } : item
      ),
      ...tripItems,
    ];

    const q = normalize(query.trim());
    if (!q) return all;

    return all.filter((item) => {
      const hay = normalize(`${item.label} ${item.hint ?? ""} ${item.keywords ?? ""} ${item.group}`);
      return hay.includes(q);
    });
  }, [trips, query, offlineCount]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, items.length]);

  const runItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router, setOpen]
  );

  const groups = useMemo(() => {
    const map = new globalThis.Map<string, CommandItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) runItem(item);
    }
  }

  let flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideCloseButton
        className={cn(
          "top-[12%] max-h-[min(78dvh,32rem)] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[18%] sm:max-w-lg",
          "rounded-2xl"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Keresés</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Keresés: utazás, menü…"
            className="min-h-[var(--touch-target)] min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:min-h-10 sm:text-sm"
            aria-label="Parancs keresése"
          />
          <DialogClose
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Bezárás"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>
        <div className="max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nincs találat
            </p>
          ) : (
            groups.map(([group, groupItems]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {groupItems.map((item) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const active = index === activeIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runItem(item)}
                          className={cn(
                            "flex w-full min-h-[var(--touch-target)] items-center gap-3 rounded-xl px-2.5 text-left transition-colors sm:min-h-10",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/70"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              active
                                ? "bg-primary-foreground/15"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.label}</span>
                            {item.hint ? (
                              <span
                                className={cn(
                                  "block truncate text-xs",
                                  active ? "text-primary-foreground/75" : "text-muted-foreground"
                                )}
                              >
                                {item.hint}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="hidden items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground sm:flex">
          <span>↑↓ navigáció · Enter megnyitás</span>
          <span>Ctrl / ⌘ K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
