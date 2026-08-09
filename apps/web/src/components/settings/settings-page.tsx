"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Eye, EyeOff, KeyRound, Palette, Settings2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { deleteAccount, updateAccountPassword, updateProfileName } from "@/actions/settings";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_PREF_CHANGE_EVENT,
  getBrowserNotificationsEnabled,
  getNotificationCategories,
  getNotificationPermission,
  setNotificationCategory,
  syncNotificationPreferencesToServer,
  type BrowserNotificationSupport,
  type NotificationCategory,
  type NotificationCategoryMap,
} from "@/lib/notification-prefs";
import {
  disablePushNotifications,
  enablePushNotifications,
  getVapidPublicKey,
  syncPushSubscriptionIfEnabled,
} from "@/lib/push-client";
import { Switch } from "@/components/ui/switch";

interface SettingsPageProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function SettingsPage({ user }: SettingsPageProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationSupport>(() =>
    getNotificationPermission()
  );
  const [notifEnabled, setNotifEnabled] = useState(() => getBrowserNotificationsEnabled());
  const [categories, setCategories] = useState<NotificationCategoryMap>(() =>
    getNotificationCategories()
  );
  const [namePending, startNameTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    function sync() {
      setNotifPermission(getNotificationPermission());
      setNotifEnabled(getBrowserNotificationsEnabled());
      setCategories(getNotificationCategories());
    }
    sync();
    void syncPushSubscriptionIfEnabled();
    window.addEventListener(NOTIFICATION_PREF_CHANGE_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(NOTIFICATION_PREF_CHANGE_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    startNameTransition(async () => {
      const result = await updateProfileName(name);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Név frissítve");
        router.refresh();
      }
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    startPasswordTransition(async () => {
      const result = await updateAccountPassword({ password, confirmPassword });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message ?? "Jelszó frissítve");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
      }
    });
  }

  async function enableNotifications() {
    const result = await enablePushNotifications();
    setNotifPermission(result.permission);
    setNotifEnabled(getBrowserNotificationsEnabled());
    setCategories(getNotificationCategories());
    if (result.permission === "granted") {
      toast.success("Értesítések bekapcsolva");
      void syncNotificationPreferencesToServer();
    } else if (result.permission === "denied") {
      toast.error("A böngésző letiltotta az értesítéseket");
    } else if (result.permission === "unsupported") {
      toast.message("Ez a böngésző nem támogatja az értesítéseket");
    }
  }

  async function toggleNotifications(next: boolean) {
    if (next) {
      if (notifPermission !== "granted") {
        await enableNotifications();
        return;
      }
      await enablePushNotifications();
      setNotifEnabled(getBrowserNotificationsEnabled());
      setCategories(getNotificationCategories());
      toast.success("Értesítések bekapcsolva");
      void syncNotificationPreferencesToServer();
      return;
    }
    await disablePushNotifications();
    setNotifEnabled(false);
    void syncNotificationPreferencesToServer();
    toast.success("Értesítések kikapcsolva");
  }

  function toggleCategory(category: NotificationCategory, enabled: boolean) {
    setNotificationCategory(category, enabled);
    setCategories(getNotificationCategories());
  }

  const masterOn = notifPermission === "granted" && notifEnabled;
  const pushReady = Boolean(getVapidPublicKey());

  function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    startDeleteTransition(async () => {
      const result = await deleteAccount(deleteConfirm);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Fiók törölve");
      router.push(result.data.redirectTo);
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Beállítások</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Profil, megjelenés és értesítések — egy helyen.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {/* Profil */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Profil</h2>
          </div>
          <form onSubmit={saveName} className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Megjelenített név</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[var(--touch-target)] sm:min-h-9"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-email">E-mail</Label>
              <Input
                id="settings-email"
                value={user.email}
                disabled
                className="min-h-[var(--touch-target)] opacity-80 sm:min-h-9"
              />
              <p className="text-xs text-muted-foreground">
                A fiók azonosítója — nem módosítható.
              </p>
            </div>
            <Button
              type="submit"
              disabled={namePending || name.trim() === user.name || name.trim().length < 2}
              className="min-h-[var(--touch-target)] w-full sm:min-h-9 sm:w-auto"
            >
              Név mentése
            </Button>
          </form>
        </section>

        {/* Jelszó */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Jelszó</h2>
          </div>
          <form onSubmit={savePassword} className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1.5">
              <Label htmlFor="settings-password">Új jelszó</Label>
              <div className="relative">
                <Input
                  id="settings-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[var(--touch-target)] pr-10 sm:min-h-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                  title={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-password-confirm">Új jelszó megerősítése</Label>
              <div className="relative">
                <Input
                  id="settings-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="min-h-[var(--touch-target)] pr-10 sm:min-h-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"
                  }
                  title={showConfirmPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={passwordPending || !password || !confirmPassword}
              className="min-h-[var(--touch-target)] w-full sm:min-h-9 sm:w-auto"
            >
              Jelszó frissítése
            </Button>
          </form>
        </section>

        {/* Megjelenés */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Megjelenés</h2>
          </div>
          <div className="flex min-h-[var(--touch-target)] items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Téma</p>
              <p className="text-xs text-muted-foreground">Világos vagy sötét mód</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Értesítések */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Értesítések</h2>
          </div>

          <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">Push értesítések</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {notifPermission === "denied"
                  ? "A böngésző tiltja — engedd az oldal beállításaiban."
                  : notifPermission === "unsupported"
                    ? "Ezen az eszközön nem elérhető."
                    : pushReady
                      ? "Akkor is, ha épp nem használod az appot."
                      : "Böngésző értesítések az emlékeztetőkről."}
              </p>
            </div>
            {notifPermission === "unsupported" || notifPermission === "denied" ? (
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground">
                {notifPermission === "denied" ? "Tiltva" : "Nem elérhető"}
              </span>
            ) : (
              <Switch
                checked={masterOn}
                onCheckedChange={(checked) => void toggleNotifications(checked)}
                aria-label="Push értesítések"
              />
            )}
          </div>

          {masterOn ? (
            <div className="divide-y">
              <p className="px-4 pb-1 pt-3 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground sm:px-5">
                Miről értesülj
              </p>
              {NOTIFICATION_CATEGORIES.map((key) => {
                const meta = NOTIFICATION_CATEGORY_LABELS[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{meta.title}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <Switch
                      checked={categories[key]}
                      onCheckedChange={(checked) => toggleCategory(key, checked)}
                      aria-label={meta.title}
                    />
                  </div>
                );
              })}
            </div>
          ) : notifPermission === "default" ? (
            <p className="px-4 py-3 text-xs text-muted-foreground sm:px-5">
              Kapcsold be, majd válaszd ki, miről szeretnél üzenetet — alapból mindegyik be van
              kapcsolva.
            </p>
          ) : null}
        </section>

        {/* Fiók törlése */}
        <section className="overflow-hidden rounded-2xl border border-destructive/25 bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-destructive/15 px-4 py-3 sm:px-5">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold tracking-tight text-destructive">Fiók törlése</h2>
          </div>
          <form onSubmit={handleDeleteAccount} className="space-y-3 p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">
              Véglegesen törli a profilodat. Előbb töröld a saját tulajdonú utazásaidat. A
              megerősítéshez írd be:{" "}
              <span className="font-mono font-semibold text-foreground">TORLES</span>
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="min-h-[var(--touch-target)] font-mono sm:min-h-9"
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="destructive"
              disabled={deletePending || deleteConfirm.trim().toUpperCase() !== "TORLES"}
              className="min-h-[var(--touch-target)] w-full sm:min-h-9 sm:w-auto"
            >
              Fiók végleges törlése
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
