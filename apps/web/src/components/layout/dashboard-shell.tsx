"use client";

import { useEffect } from "react";

/** Jelzi a portálon megjelenő dialógusoknak, hogy a sidebar melletti tartalomhoz igazodjanak. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.dashboardLayout = "true";
    return () => {
      delete document.body.dataset.dashboardLayout;
    };
  }, []);

  return <>{children}</>;
}
