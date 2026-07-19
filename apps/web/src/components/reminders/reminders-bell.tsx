"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight, X } from "lucide-react";
import type { AppReminder } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { getUserReminders, dismissReminder } from "@/actions/feature-pack";
import { cn } from "@/lib/utils";

const NOTIFIED_SESSION_KEY = "fam-reminders-notified";

export function RemindersBell({
  variant = "icon",
}: {
  variant?: "icon" | "nav";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNotifyPermission("unsupported");
      return;
    }
    setNotifyPermission(Notification.permission);
  }, [open]);

  function requestNotifyPermission() {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then((permission) => {
      setNotifyPermission(permission);
    });
  }

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => getUserReminders(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const visibleReminders = useMemo(
    () => reminders.filter((r) => !dismissing.has(r.key)),
    [reminders, dismissing]
  );

  useEffect(() => {
    if (visibleReminders.length === 0) return;
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const dedupeKey = visibleReminders
      .slice(0, 5)
      .map((r) => r.key)
      .join(",");
    const already = window.sessionStorage.getItem(NOTIFIED_SESSION_KEY);
    if (already === dedupeKey) return;

    window.sessionStorage.setItem(NOTIFIED_SESSION_KEY, dedupeKey);

    const first = visibleReminders[0];
    const title =
      visibleReminders.length === 1 ? first.title : `${visibleReminders.length} emlékeztető`;
    const body =
      visibleReminders.length === 1
        ? first.body
        : visibleReminders
            .slice(0, 3)
            .map((r) => r.title)
            .join(" · ");

    try {
      new Notification(title, { body, tag: "fam-reminders" });
    } catch {
      // Some browsers block Notification construction — safe to ignore
    }
  }, [visibleReminders]);

  function handleDismiss(key: string) {
    setDismissing((prev) => new Set(prev).add(key));
    void dismissReminder(key).then((result) => {
      if (!result.success) {
        setDismissing((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
    });
  }

  function handleNavigate(reminder: AppReminder) {
    setOpen(false);
    router.push(reminder.href);
  }

  const count = visibleReminders.length;

  const trigger =
    variant === "nav" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 font-medium transition-colors touch-manipulation",
          "text-sm min-h-[var(--touch-target)]",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          "active:scale-[0.98] active:opacity-90"
        )}
        aria-label={count > 0 ? `Emlékeztetők (${count})` : "Emlékeztetők"}
      >
        <Bell className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 text-left">Emlékeztetők</span>
        {count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.65rem] font-semibold leading-none text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
        aria-label={count > 0 ? `Értesítések (${count})` : "Értesítések"}
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-semibold leading-none text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Emlékeztetők</DialogTitle>
            <p className="mt-0.5 text-sm font-normal text-muted-foreground">
              {count > 0
                ? `${count} tennivaló vár rád az utazásaidnál`
                : "Nincs új emlékeztető"}
            </p>
          </DialogHeader>

          <DialogBody className="space-y-3">
            {notifyPermission === "default" && (
              <button
                type="button"
                onClick={requestNotifyPermission}
                className="w-full rounded-xl border border-dashed px-3 py-2.5 text-left text-xs text-muted-foreground hover:bg-muted/40"
              >
                <span className="font-medium text-foreground">Push értesítések engedélyezése</span>
                <br />
                Kapj figyelmeztetést fontos emlékeztetőkről a böngésződön keresztül is.
              </button>
            )}

            {visibleReminders.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Jelenleg nincs teendőd — minden rendben.
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleReminders.map((reminder) => (
                  <li
                    key={reminder.key}
                    className="flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => handleNavigate(reminder)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-1 text-sm font-medium">
                        {reminder.title}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {reminder.body}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Elrejtés"
                      onClick={() => handleDismiss(reminder.key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DialogBody>

          <DialogFooter className="grid grid-cols-1 sm:grid-cols-[1fr_auto]">
            {visibleReminders.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-[var(--touch-target)] w-full sm:min-h-9"
                onClick={() => visibleReminders.forEach((r) => handleDismiss(r.key))}
              >
                <Check className="h-4 w-4" />
                Összes elrejtése
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              className="min-h-[var(--touch-target)] w-full sm:min-h-9 sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Bezárás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
