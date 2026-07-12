"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster, type ToasterProps } from "sonner";

const TOAST_EDGE_PADDING_PX = 12;

function readSafeTopInset(): number {
  if (typeof window === "undefined") return TOAST_EDGE_PADDING_PX;

  let safeTop = 0;

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  safeTop = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();

  const visualTop = window.visualViewport ? Math.max(0, window.visualViewport.offsetTop) : 0;

  return Math.round(Math.max(safeTop, visualTop) + TOAST_EDGE_PADDING_PX);
}

function readToastPosition(): NonNullable<ToasterProps["position"]> {
  if (typeof window === "undefined") return "top-right";
  return window.matchMedia("(max-width: 767px)").matches ? "top-center" : "top-right";
}

export function AppToaster() {
  const [offset, setOffset] = useState(TOAST_EDGE_PADDING_PX);
  const [position, setPosition] = useState<NonNullable<ToasterProps["position"]>>("top-right");

  const updateLayout = useCallback(() => {
    setOffset(readSafeTopInset());
    setPosition(readToastPosition());
  }, []);

  useEffect(() => {
    updateLayout();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateLayout);
    viewport?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    mobileQuery.addEventListener("change", updateLayout);

    return () => {
      viewport?.removeEventListener("resize", updateLayout);
      viewport?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
      mobileQuery.removeEventListener("change", updateLayout);
    };
  }, [updateLayout]);

  return (
    <Toaster
      richColors
      position={position}
      offset={offset}
      mobileOffset={offset}
      expand
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast: "app-toast",
        },
      }}
    />
  );
}
