"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { joinTripWithInviteCode } from "@/actions/invites";

export function JoinTripDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      const result = await joinTripWithInviteCode(code);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Sikeresen csatlakoztál az utazáshoz");
      setOpen(false);
      setCode("");
      router.refresh();
      router.push(`/trips/${result.data.tripId}`);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Csatlakozás kóddal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Csatlakozás meghívó kóddal</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add meg a tulajdonostól kapott 8 karakteres kódot. Regisztráció és bejelentkezés után az utazás adatai elérhetők lesznek.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Meghívó kód</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="pl. AB12CD34"
                className="font-mono tracking-widest uppercase"
                maxLength={8}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Mégse
            </Button>
            <Button size="sm" onClick={handleJoin} disabled={code.trim().length < 6 || isPending}>
              Csatlakozás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
