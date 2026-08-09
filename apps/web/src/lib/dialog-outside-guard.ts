/**
 * Megakadályozza, hogy a Dialog bezáródjon, amikor egy portálozott
 * legördülő (Select / Popover / DatePicker) van nyitva, vagy épp most zárult be.
 *
 * A Radix Dialog `deferPointerDownOutside: true` miatt az outside-dismiss
 * gyakran csak a `click`-nél fut. Addigra a Select már bezárult, és a
 * köztes `mousedown` snapshot korábban tévesen „nincs popup” jelzést adott —
 * ezért záródott be az egész ablak a legördülő bezárásakor.
 */

type DialogOutsideEvent = {
  target: EventTarget | null;
  preventDefault: () => void;
  detail?: {
    originalEvent?: Event;
  };
};

const PORTAL_OVERLAY_SELECTOR =
  "[data-date-picker-panel], [data-select-content], [data-radix-select-content], [data-radix-select-viewport], [data-radix-popper-content-wrapper], [data-radix-popover-content], [role='listbox']";

/** Mennyi ideig tiltjuk a dialog-dismiss-t popup zárás után (gesture + focus restore). */
const DISMISS_BLOCK_MS = 500;

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

function blockDialogDismiss(ms: number = DISMISS_BLOCK_MS): void {
  dialogDismissBlockedUntil = Math.max(dialogDismissBlockedUntil, Date.now() + ms);
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

/**
 * Csak „van nyitott popup” irányba frissítünk.
 * Soha ne töröljük a flaget itt: a deferred Dialog-click / focusoutside
 * a Select bezárása UTÁN jön, amikor a DOM már üres.
 */
function snapshotPopupState(): void {
  if (hasOpenNestedPopup()) {
    popupWasOpenOnLastPointerDown = true;
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
  } else {
    // Időablak a deferred Dialog-click / focusoutside ellen.
    // A flaget töröljük: a block önmagában elég, különben az első
    // valódi overlay-kattintás is „elnyelődne”.
    blockDialogDismiss();
    popupWasOpenOnLastPointerDown = false;
  }
}

export function registerDatePickerOpenChange(open: boolean): void {
  if (open) {
    popupWasOpenOnLastPointerDown = true;
  } else {
    blockDialogDismiss();
    popupWasOpenOnLastPointerDown = false;
  }
}

export function registerPopoverOpenChange(open: boolean): void {
  if (open) {
    popupWasOpenOnLastPointerDown = true;
  } else {
    blockDialogDismiss();
    popupWasOpenOnLastPointerDown = false;
  }
}

export function shouldPreventDialogOutsideDismiss(event: DialogOutsideEvent): boolean {
  if (Date.now() < dialogDismissBlockedUntil) {
    return true;
  }

  if (popupWasOpenOnLastPointerDown) {
    // Egyszer használjuk fel a „volt nyitva” jelzést ehhez a gesztushoz.
    popupWasOpenOnLastPointerDown = false;
    blockDialogDismiss();
    return true;
  }

  if (hasOpenNestedPopup()) {
    blockDialogDismiss();
    return true;
  }

  if (isInsidePortalOverlay(event)) {
    blockDialogDismiss();
    return true;
  }

  return false;
}

export function guardDialogOutsideEvent(event: DialogOutsideEvent): void {
  if (shouldPreventDialogOutsideDismiss(event)) {
    event.preventDefault();
  }
}
