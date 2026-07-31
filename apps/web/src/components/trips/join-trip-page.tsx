"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinTripWithInviteCode } from "@/actions/invites";

export function JoinTripPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(() => (searchParams.get("code") ?? "").toUpperCase());
  const [isPending, startTransition] = useTransition();
  const [autoJoined, setAutoJoined] = useState(false);

  function handleJoin(codeToJoin: string) {
    if (codeToJoin.trim().length < 6) {
      toast.error("Érvénytelen meghívó kód");
      return;
    }
    startTransition(async () => {
      const result = await joinTripWithInviteCode(codeToJoin);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Sikeresen csatlakoztál az utazáshoz");
      router.push(`/trips/${result.data.tripId}`);
    });
  }

  useEffect(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl && fromUrl.trim().length >= 6 && !autoJoined) {
      setAutoJoined(true);
      handleJoin(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the initial code param
  }, [searchParams]);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 pb-8">
      <section className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">Csatlakozás utazáshoz</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add meg a tulajdonostól kapott meghívó kódot. Ha a linkre kattintva érkeztél, a kódot
          automatikusan kitöltöttük.
        </p>

        <div className="mt-5 space-y-1.5 text-left">
          <Label>Meghívó kód</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="pl. AB12CD34"
            className="font-mono text-lg tracking-widest uppercase"
            maxLength={8}
            disabled={isPending}
          />
        </div>

        <Button
          className="mt-4 h-11 min-h-11 w-full"
          onClick={() => handleJoin(code)}
          disabled={code.trim().length < 6 || isPending}
        >
          {isPending ? "Csatlakozás…" : "Csatlakozás"}
        </Button>
      </section>
    </div>
  );
}
