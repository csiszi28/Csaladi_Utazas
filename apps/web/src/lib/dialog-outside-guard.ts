type DialogOutsideEvent = {
  target: EventTarget | null;
  preventDefault: () => void;
  detail?: {
    originalEvent?: Event;
  };
};

const PORTAL_OVERLAY_SELECTOR =
  "[data-date-picker-panel], [data-select-content], [data-radix-select-content], [data-radix-select-viewport], [data-radix-popper-content-wrapper], [data-radix-popover-content], [role='listbox']";

let guardInitialized = false;
let popupWasOpenOnLastPointerDown = false;
let trackedSelectOpenCount = 0;
let dialogDismissBlockedUntil = 0;

function eventPath(event: DialogOutsideEvent): EventTarget[] {
  const original = event.detail?.originalEvent;
  const path =
    original && "composedPath" in original && typeof original.composedPath === "function"
      ? original.composedPath()
      : [];
  return [event.target, original?.target ?? null, ...path].filter(
    (node): node is EventTarget => node != null
  );
}

function isInsidePortalOverlay(event: DialogOutsideEvent): boolean {
  for (const node of eventPath(event)) {
    if (node instanceof Element && node.closest(PORTAL_OVERLAY_SELECTOR)) {
      return true;
    }
  }
  return false;
}

export function hasOpenNestedPopup(): boolean {
  if (typeof document === "undefined") {
    return trackedSelectOpenCount > 0;
  }

  return (
    trackedSelectOpenCount > 0 ||
    document.querySelector("[data-date-picker-panel]") !== null ||
    document.querySelector("[data-select-content]") !== null ||
    document.querySelector("[data-radix-select-content]") !== null ||
    document.querySelector('[role="listbox"]') !== null ||
    document.querySelector('[role="combobox"][aria-expanded="true"]') !== null ||
    document.querySelector("[data-radix-popover-content][data-state='open']") !== null
  );
}

function snapshotPopupState(): void {
  const open = hasOpenNestedPopup();
  popupWasOpenOnLastPointerDown = open;
  if (open) {
    dialogDismissBlockedUntil = 0;
  }
}

export function initDialogOutsideGuard(): void {
  if (guardInitialized || typeof document === "undefined") {
    return;
  }
  guardInitialized = true;

  document.addEventListener("pointerdown", snapshotPopupState, true);
  document.addEventListener("mousedown", snapshotPopupState, true);
  document.addEventListener("touchstart", snapshotPopupState, true);
}

export function registerSelectOpenChange(open: boolean): void {
  trackedSelectOpenCount = Math.max(0, trackedSelectOpenCount + (open ? 1 : -1));
  if (open) {
    popupWasOpenOnLastPointerDown = true;
  }
}

export function registerDatePickerOpenChange(open: boolean): void {
  if (open) {
    popupWasOpenOnLastPointerDown = true;
  }
}

export function shouldPreventDialogOutsideDismiss(event: DialogOutsideEvent): boolean {
  if (Date.now() < dialogDismissBlockedUntil) {
    return true;
  }

  if (popupWasOpenOnLastPointerDown) {
    dialogDismissBlockedUntil = Date.now() + 200;
    return true;
  }

  if (hasOpenNestedPopup()) {
    return true;
  }

  if (isInsidePortalOverlay(event)) {
    return true;
  }

  return false;
}

export function guardDialogOutsideEvent(event: DialogOutsideEvent): void {
  if (shouldPreventDialogOutsideDismiss(event)) {
    event.preventDefault();
  }
}
