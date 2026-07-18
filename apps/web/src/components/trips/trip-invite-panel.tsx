"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTripInviteCode,
  regenerateTripInviteCode,
} from "@/actions/invites";

export function TripInvitePanel({
  tripId,
  isOwner,
}: {
  tripId: string;
  isOwner: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOwner) return;
    startTransition(async () => {
      const result = await getTripInviteCode(tripId);
      if (result.success) setCode(result.data.code);
    });
  }, [tripId, isOwner]);

  if (!isOwner) return null;

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Meghívó kód másolva");
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

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Add meg ezt a kódot a családtagoknak, vagy állíts be e-mail címet a Család oldalon —
        regisztrációkor automatikusan összekapcsolódik és hozzáfér az utazásokhoz.
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
            onClick={handleCopy}
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
    </div>
  );
}
