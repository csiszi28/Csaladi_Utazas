"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { registerPopoverOpenChange } from "@/lib/dialog-outside-guard";

type PopoverControlContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closeFromTrigger: () => void;
};

const PopoverControlContext = React.createContext<PopoverControlContextValue | null>(null);

function Popover({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;
  const openRef = React.useRef(open);
  openRef.current = open;
  const suppressOpenUntilRef = React.useRef(0);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (next && Date.now() < suppressOpenUntilRef.current) return;
      if (openRef.current === next) return;
      openRef.current = next;
      if (!isControlled) setUncontrolledOpen(next);
      registerPopoverOpenChange(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const closeFromTrigger = React.useCallback(() => {
    suppressOpenUntilRef.current = Date.now() + 500;
    setOpen(false);
  }, [setOpen]);

  const contextValue = React.useMemo(
    () => ({ open, setOpen, closeFromTrigger }),
    [open, setOpen, closeFromTrigger]
  );

  return (
    <PopoverControlContext.Provider value={contextValue}>
      <PopoverPrimitive.Root {...props} open={open} onOpenChange={setOpen} />
    </PopoverControlContext.Provider>
  );
}

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ onPointerDown, onClick, ...props }, ref) => {
  const control = React.useContext(PopoverControlContext);

  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      data-popover-trigger=""
      {...props}
      onPointerDown={(event) => {
        event.preventDefault();
        try {
          event.currentTarget.focus({ preventScroll: true });
        } catch {
          event.currentTarget.focus();
        }
        if (control?.open) control.closeFromTrigger();
        else control?.setOpen(true);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        // Radix Popover Trigger onClick-en toggle-öl — a pointer utáni click
        // újranyitná. detail === 0: billentyű (Space/Enter), ott mi nyitunk/zárunk.
        event.preventDefault();
        if (event.detail === 0) {
          if (control?.open) control.closeFromTrigger();
          else control?.setOpen(true);
        }
        onClick?.(event);
      }}
    />
  );
});
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    { className, align = "center", sideOffset = 4, onCloseAutoFocus, onPointerDownOutside, ...props },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-radix-popover-content=""
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[70] w-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          className
        )}
        onPointerDownOutside={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("[data-popover-trigger]")) {
            event.preventDefault();
          }
          onPointerDownOutside?.(event);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseAutoFocus?.(event);
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
