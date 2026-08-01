"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { Toaster, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

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

function ToastIcon({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "error" | "warning" | "info" | "neutral";
}) {
  return (
    <span className={`app-toast-icon app-toast-icon--${tone}`} aria-hidden>
      {children}
    </span>
  );
}

export function AppToaster() {
  const { resolved } = useTheme();
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
      theme={resolved}
      position={position}
      offset={offset}
      mobileOffset={offset}
      expand
      gap={10}
      visibleToasts={4}
      closeButton
      duration={3800}
      className="app-toaster"
      icons={{
        success: (
          <ToastIcon tone="success">
            <Check strokeWidth={2.5} className="h-3.5 w-3.5" />
          </ToastIcon>
        ),
        error: (
          <ToastIcon tone="error">
            <CircleAlert strokeWidth={2.25} className="h-3.5 w-3.5" />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon tone="warning">
            <TriangleAlert strokeWidth={2.25} className="h-3.5 w-3.5" />
          </ToastIcon>
        ),
        info: (
          <ToastIcon tone="info">
            <Info strokeWidth={2.25} className="h-3.5 w-3.5" />
          </ToastIcon>
        ),
        loading: (
          <ToastIcon tone="neutral">
            <LoaderCircle strokeWidth={2.25} className="h-3.5 w-3.5 animate-spin" />
          </ToastIcon>
        ),
        close: <X strokeWidth={2.25} className="h-3.5 w-3.5" />,
      }}
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
          closeButton: "app-toast-close",
          icon: "app-toast-icon-slot",
          success: "app-toast--success",
          error: "app-toast--error",
          warning: "app-toast--warning",
          info: "app-toast--info",
          loading: "app-toast--loading",
        },
      }}
    />
  );
}
