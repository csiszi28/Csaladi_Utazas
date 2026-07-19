"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggleLightDark } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      style={{ width: "var(--touch-target)", height: "var(--touch-target)" }}
      onClick={toggleLightDark}
      aria-label={resolved === "dark" ? "Világos mód" : "Sötét mód"}
      title={resolved === "dark" ? "Világos mód" : "Sötét mód"}
    >
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
