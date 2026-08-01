"use client";

import { useState, useTransition } from "react";
import { Bell, KeyRound, Palette, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { deleteAccount, updateAccountPassword, updateProfileName } from "@/actions/settings";
import { cn } from "@/lib/utils";

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
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
      return Notification.permission;
    }
  );
  const [namePending, startNameTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();

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
      }
    });
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      toast.message("Ez a böngésző nem támogatja az értesítéseket");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") toast.success("Értesítések engedélyezve");
    else if (permission === "denied") toast.error("Értesítések megtagadva");
  }

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
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Beállítások</h1>
        <p className="text-sm text-muted-foreground">
          Profil, megjelenés és értesítések — mobilbarát, gyors elérés.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Profil</h2>
        </div>
        <form onSubmit={saveName} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Megjelenített név</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[var(--touch-target)]"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">E-mail</Label>
            <Input
              id="settings-email"
              value={user.email}
              disabled
              className="min-h-[var(--touch-target)] opacity-80"
            />
            <p className="text-xs text-muted-foreground">
              Az e-mail cím a fiók azonosítója; módosításhoz vedd fel a kapcsolatot a támogatással.
            </p>
          </div>
          <Button
            type="submit"
            disabled={namePending || name.trim() === user.name || name.trim().length < 2}
            className="min-h-[var(--touch-target)] w-full sm:w-auto"
          >
            Név mentése
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Jelszó</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="settings-password">Új jelszó</Label>
            <Input
              id="settings-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[var(--touch-target)]"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-password-confirm">Új jelszó megerősítése</Label>
            <Input
              id="settings-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-h-[var(--touch-target)]"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            disabled={passwordPending || password.length < 8}
            className="min-h-[var(--touch-target)] w-full sm:w-auto"
          >
            Jelszó frissítése
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Megjelenés</h2>
        </div>
        <div
          className={cn(
            "flex min-h-[var(--touch-target)] items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2"
          )}
        >
          <div>
            <p className="text-sm font-medium">Téma</p>
            <p className="text-xs text-muted-foreground">Világos / sötét váltás</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Értesítések</h2>
        </div>
        <div className="space-y-3 rounded-xl border bg-muted/20 px-3 py-3">
          <p className="text-sm text-muted-foreground">
            Böngésző értesítések az emlékeztetőkhöz (pl. holnapi program, közelgő út).
          </p>
          <p className="text-xs text-muted-foreground">
            Állapot:{" "}
            <span className="font-medium text-foreground">
              {notifPermission === "unsupported"
                ? "Nem támogatott"
                : notifPermission === "granted"
                  ? "Engedélyezve"
                  : notifPermission === "denied"
                    ? "Tiltva"
                    : "Még nem kérve"}
            </span>
          </p>
          {notifPermission !== "unsupported" && notifPermission !== "granted" ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[var(--touch-target)] w-full sm:w-auto"
              onClick={requestNotifications}
            >
              Engedély kérése
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold text-destructive">Fiók törlése</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Véglegesen törli a profilodat. Előbb töröld a saját tulajdonú utazásaidat. A megerősítéshez
          írd be: <span className="font-mono font-semibold text-foreground">TORLES</span>
        </p>
        <form onSubmit={handleDeleteAccount} className="space-y-3">
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="TORLES"
            className="min-h-[var(--touch-target)] font-mono"
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={deletePending || deleteConfirm.trim().toUpperCase() !== "TORLES"}
            className="min-h-[var(--touch-target)] w-full sm:w-auto"
          >
            Fiók végleges törlése
          </Button>
        </form>
      </section>
    </div>
  );
}
