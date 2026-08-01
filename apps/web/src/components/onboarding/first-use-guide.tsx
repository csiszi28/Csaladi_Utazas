"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Map, Users, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fam-onboarding-dismissed-v1";

interface FirstUseGuideProps {
  hasTrips: boolean;
  hasFamilyMembers: boolean;
  className?: string;
}

const STEPS = [
  {
    id: "family",
    title: "Családtagok",
    description: "Add hozzá, kikkel utaztok",
    href: "/family",
    icon: Users,
    doneKey: "hasFamilyMembers" as const,
  },
  {
    id: "trip",
    title: "Első utazás",
    description: "Hozz létre vagy csatlakozz egy úthoz",
    href: "/trips",
    icon: Map,
    doneKey: "hasTrips" as const,
  },
  {
    id: "budget",
    title: "Költségvetés",
    description: "Állíts be limitet az utazás szerkesztésénél",
    href: "/trips",
    icon: Wallet,
    doneKey: "hasTrips" as const,
  },
] as const;

export function FirstUseGuide({
  hasTrips,
  hasFamilyMembers,
  className,
}: FirstUseGuideProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const flags = { hasTrips, hasFamilyMembers };
  const doneCount = STEPS.filter((s) => flags[s.doneKey]).length;
  const allDone = doneCount >= 2 && hasTrips;

  if (dismissed || allDone) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Első lépések
          </p>
          <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Induljunk el együtt
          </h2>
          <p className="text-sm text-muted-foreground">
            {doneCount}/{STEPS.length} kész · pár perc alatt használható a családi út szervező
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[var(--touch-target)] shrink-0 self-start sm:min-h-9"
          onClick={dismiss}
        >
          Elrejtés
        </Button>
      </div>

      <div className="grid gap-2 border-t p-3 sm:grid-cols-3 sm:p-4">
        {STEPS.map((step, index) => {
          const done = flags[step.doneKey];
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "flex min-h-[var(--touch-target)] items-start gap-3 rounded-xl border px-3 py-3 transition-all active:scale-[0.99]",
                done
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "bg-background/80 hover:border-primary/30 hover:bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  done
                    ? "bg-emerald-500 text-white"
                    : "bg-primary/10 text-primary"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {index + 1}. {step.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {step.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
