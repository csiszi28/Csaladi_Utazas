"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import { dismissReminder, dismissAllReminders, getUserReminders } from "@/actions/feature-pack";
import {
  NOTIFICATION_PREF_CHANGE_EVENT,
  canShowBrowserNotifications,
  getBrowserNotificationsEnabled,
  getNotificationPermission,
  isNotificationCategoryEnabled,
  type BrowserNotificationSupport,
} from "@/lib/notification-prefs";
import { enablePushNotifications } from "@/lib/push-client";
import { cn } from "@/lib/utils";

const NOTIFIED_DAY_KEY = "fam-reminders-notified-day";
const SEEN_KEYS_STORAGE = "fam-reminders-seen-keys";
const PUSH_PROMPT_DISMISSED_KEY = "fam-reminders-push-prompt-dismissed";

function readSeenKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEYS_STORAGE);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    return new Set();
  }
}

function writeSeenKeys(keys: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEYS_STORAGE, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

function isPushPromptDismissed(): boolean {
  try {
    return window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissPushPrompt() {
  try {
    window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function RemindersBell({
  variant = "icon",
}: {
  variant?: "icon" | "nav";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [seenKeys, setSeenKeys] = useState<Set<string>>(() => new Set());
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<BrowserNotificationSupport>("default");

  useEffect(() => {
    function sync() {
      setNotifyPermission(getNotificationPermission());
      setSeenKeys(readSeenKeys());
      const enabled = getBrowserNotificationsEnabled();
      const permission = getNotificationPermission();
      setShowPushPrompt(
        !isPushPromptDismissed() &&
          permission === "default" &&
          !enabled
      );
    }
    sync();
    window.addEventListener(NOTIFICATION_PREF_CHANGE_EVENT, sync);
    return () => window.removeEventListener(NOTIFICATION_PREF_CHANGE_EVENT, sync);
  }, []);

  async function enableNotifications() {
    const result = await enablePushNotifications();
    setNotifyPermission(result.permission);
    if (result.permission === "granted") {
      dismissPushPrompt();
      setShowPushPrompt(false);
      toast.success(result.message ?? "Értesítések bekapcsolva");
    } else if (result.message) {
      toast.message(result.message, { duration: 8000 });
    }
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

  const unreadCount = useMemo(
    () => visibleReminders.filter((r) => !seenKeys.has(r.key)).length,
    [visibleReminders, seenKeys]
  );

  function markKeysSeen(keys: string[]) {
    if (keys.length === 0) return;
    setSeenKeys((prev) => {
      const next = new Set(prev);
      for (const key of keys) next.add(key);
      writeSeenKeys(next);
      return next;
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      markKeysSeen(visibleReminders.map((r) => r.key));
    }
  }

  useEffect(() => {
    if (visibleReminders.length === 0) return;
    if (!canShowBrowserNotifications()) return;
    if (!isNotificationCategoryEnabled("reminders")) return;

    const dayKey = new Date().toISOString().slice(0, 10);
    const dedupeKey = `${dayKey}:${visibleReminders
      .slice(0, 5)
      .map((r) => r.key)
      .join(",")}`;

    try {
      if (window.localStorage.getItem(NOTIFIED_DAY_KEY) === dedupeKey) return;
      window.localStorage.setItem(NOTIFIED_DAY_KEY, dedupeKey);
    } catch {
      return;
    }

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

    async function showNotification() {
      try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration?.showNotification) {
          await registration.showNotification(title, {
            body,
            tag: "fam-reminders",
            data: { href: first.href },
          });
          return;
        }
      } catch {
        /* fall through */
      }
      try {
        new Notification(title, { body, tag: "fam-reminders" });
      } catch {
        /* ignore */
      }
    }

    void showNotification();
  }, [visibleReminders]);

  function handleDismiss(key: string) {
    setDismissing((prev) => new Set(prev).add(key));
    markKeysSeen([key]);
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

  function handleMarkAllRead() {
    markKeysSeen(visibleReminders.map((r) => r.key));
    toast.success("Összes olvasottnak jelölve");
  }

  function handleDeleteAll() {
    const keys = visibleReminders.map((r) => r.key);
    if (keys.length === 0) return;
    setDismissing((prev) => {
      const next = new Set(prev);
      for (const key of keys) next.add(key);
      return next;
    });
    markKeysSeen(keys);
    void dismissAllReminders(keys).then((result) => {
      if (!result.success) {
        setDismissing(new Set());
        toast.error(result.error ?? "Nem sikerült törölni");
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Emlékeztetők törölve");
    });
  }

  function handleNavigate(reminder: AppReminder) {
    markKeysSeen([reminder.key]);
    setOpen(false);
    router.push(reminder.href);
  }

  const badgeCount = unreadCount;

  const trigger =
    variant === "nav" ? (
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-2xl px-2.5 font-medium transition-colors duration-200 touch-manipulation",
          "text-sm min-h-[var(--touch-target)]",
          "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
          "dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white"
        )}
        aria-label={badgeCount > 0 ? `Emlékeztetők (${badgeCount})` : "Emlékeztetők"}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            "bg-muted/70 text-muted-foreground group-hover:bg-background group-hover:text-foreground",
            "dark:bg-white/8 dark:text-sky-100/80 dark:ring-1 dark:ring-white/10 dark:group-hover:bg-white/12 dark:group-hover:text-white"
          )}
        >
          <Bell className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">Emlékeztetők</span>
        {badgeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.65rem] font-semibold leading-none text-destructive-foreground">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
        aria-label={badgeCount > 0 ? `Értesítések (${badgeCount})` : "Értesítések"}
        className="relative"
        onClick={() => handleOpenChange(true)}
      >
        <Bell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-semibold leading-none text-destructive-foreground">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </Button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Emlékeztetők</DialogTitle>
            <p className="mt-0.5 text-sm font-normal text-muted-foreground">
              {visibleReminders.length > 0
                ? `${visibleReminders.length} tennivaló az utazásaidnál`
                : "Nincs új emlékeztető"}
            </p>
          </DialogHeader>

          <DialogBody className="space-y-3">
            {showPushPrompt && notifyPermission === "default" ? (
              <div className="flex items-start gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                <button
                  type="button"
                  onClick={() => void enableNotifications()}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-sm font-medium text-foreground">
                    Értesítések bekapcsolása
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Háttérben is jelez, ha van teendő
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Ne jelenjen meg újra"
                  onClick={() => {
                    dismissPushPrompt();
                    setShowPushPrompt(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {visibleReminders.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Jelenleg nincs teendőd — minden rendben.
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleReminders.map((reminder) => {
                  const unread = !seenKeys.has(reminder.key);
                  return (
                    <li
                      key={reminder.key}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5",
                        unread && "border-primary/25 bg-primary/[0.03]"
                      )}
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
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Törlés"
                        onClick={() => handleDismiss(reminder.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </DialogBody>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {visibleReminders.length > 0 ? (
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[var(--touch-target)] w-full sm:min-h-9"
                  onClick={handleMarkAllRead}
                >
                  <Check className="h-4 w-4" />
                  Összes olvasott
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[var(--touch-target)] w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-9"
                  onClick={handleDeleteAll}
                >
                  <Trash2 className="h-4 w-4" />
                  Összes törlése
                </Button>
              </div>
            ) : (
              <span />
            )}
            <Button
              type="button"
              className="min-h-[var(--touch-target)] w-full sm:min-h-9 sm:w-auto"
              onClick={() => handleOpenChange(false)}
            >
              Bezárás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
