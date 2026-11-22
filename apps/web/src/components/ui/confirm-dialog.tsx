"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title?: string;
  /** Mit törlünk (pl. „A(z) „Balaton” utazás”) — a leírásba kerül. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/** `await confirm({ description: "..." })` — igaz, ha a felhasználó megerősítette. */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm csak a ConfirmProvider-en belül használható");
  return ctx;
}

/** Megerősítő kérdés törléshez. */
export function useConfirmDelete() {
  const confirm = useConfirm();
  return React.useCallback(
    (what?: React.ReactNode) =>
      confirm({
        title: "Biztosan törlöd?",
        description: what ? (
          <>
            Biztosan törlöd <span className="font-medium text-foreground">{what}</span>? Ez a
            művelet nem vonható vissza.
          </>
        ) : (
          "Ez a művelet nem vonható vissza."
        ),
        confirmLabel: "Törlés",
        destructive: true,
      }),
    [confirm]
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>((options = {}) => {
    // Ha már van nyitott kérdés, azt elutasítjuk
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ options, resolve });
    });
  }, []);

  function close(result: boolean) {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }

  const options = state?.options;
  const destructive = options?.destructive ?? true;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state != null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle>{options?.title ?? "Biztosan törlöd?"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {options?.description ?? "Ez a művelet nem vonható vissza."}
            </p>
          </DialogBody>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[var(--touch-target)] sm:min-h-9"
              onClick={() => close(false)}
            >
              {options?.cancelLabel ?? "Mégse"}
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              className="min-h-[var(--touch-target)] sm:min-h-9"
              onClick={() => close(true)}
            >
              {options?.confirmLabel ?? "Törlés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
