"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Check, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { Toaster, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

const EDGE_PADDING_PX = 16;

function readCssEnvPx(property: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;top:0;left:0;padding:env(${property},0px);visibility:hidden;pointer-events:none`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return value;
}

/** Jobb felső sarok a látható viewporthoz (visualViewport + safe-area) igazítva. */
function readTopRightOffset(): { top: number; right: number; maxWidthPx: number } {
  if (typeof window === "undefined") {
    return {
      top: EDGE_PADDING_PX,
      right: EDGE_PADDING_PX,
      maxWidthPx: 360,
    };
  }

  const safeTop = readCssEnvPx("safe-area-inset-top");
  const safeRight = readCssEnvPx("safe-area-inset-right");

  const vv = window.visualViewport;
  const visualTop = vv ? Math.max(0, vv.offsetTop) : 0;
  const visualRightGap = vv
    ? Math.max(0, window.innerWidth - (vv.offsetLeft + vv.width))
    : 0;
  const visualWidth = vv?.width ?? window.innerWidth;

  const top = Math.round(visualTop + safeTop + EDGE_PADDING_PX);
  const right = Math.round(visualRightGap + safeRight + EDGE_PADDING_PX);
  // Toast szélesség: elférjen a látható szélességben a jobb/bal margóval
  const maxWidthPx = Math.round(
    Math.min(360, Math.max(200, visualWidth - EDGE_PADDING_PX * 2 - safeRight))
  );

  return { top, right, maxWidthPx };
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
  const [offset, setOffset] = useState<NonNullable<ToasterProps["offset"]>>({
    top: EDGE_PADDING_PX,
    right: EDGE_PADDING_PX,
  });
  const [maxWidthPx, setMaxWidthPx] = useState(360);

  const updateLayout = useCallback(() => {
    const { top, right, maxWidthPx: width } = readTopRightOffset();
    setOffset({ top, right });
    setMaxWidthPx(width);
  }, []);

  useEffect(() => {
    updateLayout();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateLayout);
    viewport?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);

    return () => {
      viewport?.removeEventListener("resize", updateLayout);
      viewport?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
    };
  }, [updateLayout]);

  const toasterStyle = {
    "--width": `${maxWidthPx}px`,
  } as CSSProperties;

  return (
    <Toaster
      theme={resolved}
      position="top-right"
      offset={offset}
      mobileOffset={offset}
      expand
      gap={10}
      visibleToasts={4}
      closeButton
      duration={3800}
      className="app-toaster"
      style={toasterStyle}
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
