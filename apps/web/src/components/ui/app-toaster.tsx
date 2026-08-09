"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Check, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { Toaster, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

const EDGE_PADDING_PX = 16;
const MOBILE_MQ = "(max-width: 767px)";

function readSafeInset(side: "top" | "right" | "left"): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  const env =
    side === "top"
      ? "safe-area-inset-top"
      : side === "right"
        ? "safe-area-inset-right"
        : "safe-area-inset-left";
  probe.style.cssText = `position:fixed;top:0;left:0;padding-${side}:env(${env},0px);visibility:hidden;pointer-events:none`;
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const value =
    Number.parseFloat(
      side === "top"
        ? style.paddingTop
        : side === "right"
          ? style.paddingRight
          : style.paddingLeft
    ) || 0;
  probe.remove();
  return value;
}

type ToastLayout = {
  position: NonNullable<ToasterProps["position"]>;
  offset: { top: number; right: number; left: number };
  maxWidthPx: number;
};

/** Látható viewporthoz igazított toast elhelyezés (mobil: középen, desktop: jobb felül). */
function readToastLayout(): ToastLayout {
  if (typeof window === "undefined") {
    return {
      position: "top-right",
      offset: { top: EDGE_PADDING_PX, right: EDGE_PADDING_PX, left: EDGE_PADDING_PX },
      maxWidthPx: 360,
    };
  }

  const isMobile = window.matchMedia(MOBILE_MQ).matches;
  const safeTop = readSafeInset("top");
  const safeRight = readSafeInset("right");
  const safeLeft = readSafeInset("left");

  const vv = window.visualViewport;
  const visualTop = vv ? Math.max(0, vv.offsetTop) : 0;
  const visualLeftGap = vv ? Math.max(0, vv.offsetLeft) : 0;
  const visualRightGap = vv
    ? Math.max(0, window.innerWidth - (vv.offsetLeft + vv.width))
    : 0;
  const visualWidth = vv?.width ?? document.documentElement.clientWidth ?? window.innerWidth;

  const top = Math.round(visualTop + safeTop + EDGE_PADDING_PX);
  const left = Math.round(visualLeftGap + safeLeft + EDGE_PADDING_PX);
  const right = Math.round(visualRightGap + safeRight + EDGE_PADDING_PX);
  const maxWidthPx = Math.min(
    360,
    Math.max(160, Math.floor(visualWidth - EDGE_PADDING_PX * 2 - safeLeft - safeRight))
  );

  if (isMobile) {
    return {
      position: "top-center",
      offset: { top, left, right },
      maxWidthPx,
    };
  }

  return {
    position: "top-right",
    offset: { top, right, left },
    maxWidthPx,
  };
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
  const [layout, setLayout] = useState<ToastLayout>(() => ({
    position: "top-right",
    offset: { top: EDGE_PADDING_PX, right: EDGE_PADDING_PX, left: EDGE_PADDING_PX },
    maxWidthPx: 360,
  }));

  const updateLayout = useCallback(() => {
    setLayout(readToastLayout());
  }, []);

  useEffect(() => {
    updateLayout();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateLayout);
    viewport?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);

    const mobileQuery = window.matchMedia(MOBILE_MQ);
    mobileQuery.addEventListener("change", updateLayout);

    return () => {
      viewport?.removeEventListener("resize", updateLayout);
      viewport?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
      mobileQuery.removeEventListener("change", updateLayout);
    };
  }, [updateLayout]);

  const toasterStyle = {
    "--width": `${layout.maxWidthPx}px`,
    "--toast-offset-top": `${layout.offset.top}px`,
    "--toast-offset-right": `${layout.offset.right}px`,
    "--toast-offset-left": `${layout.offset.left}px`,
    // Sonner mobil calc(100% - 2*offset) ne zsugorítsa össze a toastot
    "--mobile-offset-left": "0px",
    "--mobile-offset-right": "0px",
  } as CSSProperties;

  return (
    <Toaster
      theme={resolved}
      position={layout.position}
      offset={layout.offset.top}
      mobileOffset={layout.offset.top}
      expand
      gap={8}
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
