"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerSelectOpenChange } from "@/lib/dialog-outside-guard";

type SelectControlContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closeFromTrigger: () => void;
};

const SelectControlContext = React.createContext<SelectControlContextValue | null>(null);

function Select({
  onOpenChange,
  open: openProp,
  defaultOpen,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
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
      registerSelectOpenChange(next);
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
    <SelectControlContext.Provider value={contextValue}>
      <SelectPrimitive.Root {...props} open={open} onOpenChange={setOpen} />
    </SelectControlContext.Provider>
  );
}

const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, onPointerDown, onClick, ...props }, ref) => {
  const control = React.useContext(SelectControlContext);

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-select-trigger=""
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate",
        className
      )}
      {...props}
      onPointerDown={(event) => {
        // Radix: composeEventHandlers — ha defaultPrevented, a belső handleOpen nem fut.
        event.preventDefault();
        try {
          event.currentTarget.focus({ preventScroll: true });
        } catch {
          event.currentTarget.focus();
        }

        // Csak a renderbeli open — ne ref / ne !prev (dismiss után újranyitna).
        if (control?.open) {
          control.closeFromTrigger();
        } else {
          control?.setOpen(true);
        }
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        // Radix touch útvonal: onClick → handleOpen, ha pointerType !== "mouse".
        // pointerdown preventDefault miatt a pointerType gyakran „touch” marad,
        // így egérnél is a click újranyitná — mindig blokkoljuk.
        // (Billentyű: Space/Enter a Radix onKeyDown OPEN_KEYS útvonalán megy.)
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(
  (
    {
      className,
      children,
      position = "popper",
      onCloseAutoFocus,
      onPointerDownOutside,
      ...props
    },
    ref
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        data-select-content=""
        className={cn(
          "relative z-[70] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
          position === "popper" &&
            "translate-y-1 md:w-[var(--radix-select-trigger-width)] md:min-w-[var(--radix-select-trigger-width)]",
          className
        )}
        position={position}
        onPointerDownOutside={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("[data-select-trigger]")) {
            event.preventDefault();
          }
          onPointerDownOutside?.(event);
        }}
        onCloseAutoFocus={(event) => {
          // Ne rabolja vissza a fókuszt a triggerre (pl. másik mezőre kattintáskor).
          // A dialog-outside-guard blokkolja a Dialog dismiss-t a zárás után.
          event.preventDefault();
          onCloseAutoFocus?.(event);
        }}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" && "w-full md:min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
