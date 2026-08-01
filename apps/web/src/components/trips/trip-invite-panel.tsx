"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Mail, RefreshCw, Share2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTripInviteCode,
  regenerateTripInviteCode,
  sendTripInviteEmail,
} from "@/actions/invites";

export function TripInvitePanel({
  tripId,
  isOwner,
  tripTitle,
}: {
  tripId: string;
  isOwner: boolean;
  tripTitle?: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    startTransition(async () => {
      const result = await getTripInviteCode(tripId);
      if (result.success) setCode(result.data.code);
    });
  }, [tripId, isOwner]);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (!isOwner) return null;

  const inviteUrl =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/trips/join?code=${code}`
      : null;

  function handleCopyCode() {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    toast.success("Meghívó kód másolva");
  }

  function handleCopyLink() {
    if (!inviteUrl) return;
    void navigator.clipboard.writeText(inviteUrl);
    toast.success("Meghívó link másolva");
  }

  async function handleShare() {
    if (!inviteUrl) return;
    try {
      await navigator.share({
        title: tripTitle ? `Csatlakozás: ${tripTitle}` : "Csatlakozás az utazáshoz",
        text: "Csatlakozz az utazáshoz a Családi Utazás appban:",
        url: inviteUrl,
      });
    } catch {
      // user cancelled — ignore
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateTripInviteCode(tripId);
      if (!result.success) toast.error(result.error);
      else {
        setCode(result.data.code);
        toast.success("Új meghívó kód generálva");
      }
    });
  }

  function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    const target = inviteEmail.trim();
    if (!target) return;

    startEmailTransition(async () => {
      const result = await sendTripInviteEmail({ tripId, email: target });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (result.data.sent) {
        toast.success(`Meghívó elküldve: ${target}`);
        setInviteEmail("");
        return;
      }

      // No Resend key — open mailto as fallback
      const subject = encodeURIComponent(
        tripTitle ? `Csatlakozz: ${tripTitle}` : "Csatlakozz az utazáshoz"
      );
      const body = encodeURIComponent(
        `Szia!\n\nCsatlakozz az utazáshoz a Családi Utazás appban ezen a linken:\n${inviteUrl ?? ""}\n\nVagy add meg ezt a kódot: ${code ?? ""}`
      );
      window.location.href = `mailto:${encodeURIComponent(target)}?subject=${subject}&body=${body}`;
      toast.message("E-mail szolgáltató nincs beállítva — megnyílt a levelező");
    });
  }

  const mailSubject = encodeURIComponent(
    tripTitle ? `Csatlakozz: ${tripTitle}` : "Csatlakozz az utazáshoz"
  );
  const mailBody = encodeURIComponent(
    `Szia!\n\nCsatlakozz az utazáshoz a Családi Utazás appban ezen a linken:\n${inviteUrl ?? ""}\n\nVagy add meg ezt a kódot: ${code ?? ""}`
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Add meg ezt a kódot a családtagoknak, vagy küldd el a linket — regisztrációkor
        automatikusan összekapcsolódik és hozzáfér az utazásokhoz.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 space-y-1">
          <Label>Kód</Label>
          <Input
            readOnly
            value={code ?? "Betöltés…"}
            className="h-8 font-mono text-sm tracking-widest"
          />
        </div>
        <div className="flex gap-1.5 sm:items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 sm:flex-none"
            onClick={handleCopyCode}
            disabled={!code || isPending}
          >
            <Copy className="h-3.5 w-3.5" />
            Másolás
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 sm:flex-none"
            onClick={handleRegenerate}
            disabled={isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Új kód
          </Button>
        </div>
      </div>

      {inviteUrl ? (
        <div className="space-y-1">
          <Label>Meghívó link</Label>
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <Input readOnly value={inviteUrl} className="h-9 flex-1 text-sm" />
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
                onClick={handleCopyLink}
              >
                <Copy className="h-3.5 w-3.5" />
                Link
              </Button>
              {canShare ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
                  onClick={handleShare}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Megosztás
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
                  asChild
                >
                  <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`}>
                    <Mail className="h-3.5 w-3.5" />
                    E-mail
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSendEmail} className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
        <Label htmlFor="invite-email">Meghívó e-mailben</Label>
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="családtag@email.hu"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="h-9 min-h-[var(--touch-target)] flex-1 sm:min-h-9"
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 min-h-[var(--touch-target)] sm:min-h-9"
            disabled={emailPending || !inviteEmail.trim() || !code}
          >
            <Send className="h-3.5 w-3.5" />
            Küldés
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Ha van Resend kulcs a szerveren, azonnal kiküldjük; különben megnyílik a leveleződ.
        </p>
      </form>
    </div>
  );
}
