"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Plane,
  Train,
  Bus,
  Car,
  Ship,
  MapPin,
} from "lucide-react";
import {
  formatDate,
  TRANSPORT_TYPE_LABELS,
  type TransportType,
} from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { useDeleteTransport } from "@/hooks/use-transports";
import type { TripDetailRow } from "@/lib/queries/trips";
import { TransportFormDrawer } from "./transport-form-drawer";
import { CostChips } from "./cost-chips";
import { TRIP_SECTION_BTN_CLASS } from "./trip-section-styles";
import { TripSectionHeading } from "./trip-detail-tabs";

type TransportRow = TripDetailRow["transports"][number];

interface TripTransportsSectionProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  transports: TransportRow[];
  participants: { id: string; name: string }[];
  costs: TripDetailRow["costs"];
  onRefresh: () => void;
  openSignal?: number;
}

function TransportIcon({ type }: { type: string }) {
  const className = "h-4 w-4 shrink-0 text-primary";
  switch (type as TransportType) {
    case "FLIGHT":
      return <Plane className={className} />;
    case "TRAIN":
      return <Train className={className} />;
    case "BUS":
      return <Bus className={className} />;
    case "CAR":
      return <Car className={className} />;
    case "FERRY":
      return <Ship className={className} />;
    default:
      return <Car className={className} />;
  }
}

export function TripTransportsSection({
  tripId,
  tripStartDate,
  tripEndDate,
  transports,
  participants,
  costs,
  onRefresh,
  openSignal = 0,
}: TripTransportsSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRow | null>(null);
  const deleteMutation = useDeleteTransport();

  useEffect(() => {
    if (openSignal > 0) {
      setEditing(null);
      setDrawerOpen(true);
    }
  }, [openSignal]);

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd ezt a közlekedést?")) return;
    const result = await deleteMutation.mutateAsync(id);
    if (result.success) onRefresh();
  }

  return (
    <div className="space-y-4">
      <TripSectionHeading
        title="Közlekedés"
        action={
          <Button
            type="button"
            className={TRIP_SECTION_BTN_CLASS}
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Új közlekedés
          </Button>
        }
      />

      {transports.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Még nincsenek rögzített járatok vagy utak. Add hozzá a repülőjegyeket, vonatokat vagy
            autóutakat.
          </p>
          <Button
            type="button"
            className={`mt-4 ${TRIP_SECTION_BTN_CLASS}`}
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Első közlekedés
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {transports.map((t) => {
            const route = [t.fromLocation, t.toLocation].filter(Boolean).join(" → ");
            const linkedCosts = costs.filter((c) => c.transportId === t.id);
            return (
              <li key={t.id} className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <TransportIcon type={t.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold leading-tight">{t.title}</h3>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                        {TRANSPORT_TYPE_LABELS[(t.type as TransportType) || "OTHER"] ?? t.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(t.departureDate)}
                      {t.departureTime ? ` · ${t.departureTime}` : ""}
                      {t.arrivalDate
                        ? ` → ${formatDate(t.arrivalDate)}${t.arrivalTime ? ` ${t.arrivalTime}` : ""}`
                        : ""}
                    </p>
                    {route ? (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {route}
                      </p>
                    ) : null}
                    {t.bookingRef ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Foglalás: {t.bookingRef}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <MonogramGroup
                        names={t.participants.map((p) => p.familyMember.name)}
                      />
                    </div>
                    {linkedCosts.length > 0 ? (
                      <div className="mt-2">
                        <CostChips
                          costs={linkedCosts.map((c) => ({
                            id: c.id,
                            title: c.title,
                            amount: c.amount,
                            currency: c.currency,
                            amountScope: c.amountScope,
                            category: c.category,
                          }))}
                          participantCount={t.participants.length}
                        />
                      </div>
                    ) : null}
                    {linkedCosts.length === 0 ? null : (
                      <div className="mt-1 text-sm font-medium">
                        <CostAmountDisplay
                          amount={linkedCosts.reduce((s, c) => s + c.amount, 0)}
                          currency={linkedCosts[0]?.currency ?? "HUF"}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {t.url ? (
                      <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <a href={t.url} target="_blank" rel="noreferrer" aria-label="Link">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        setEditing(t);
                        setDrawerOpen(true);
                      }}
                      aria-label="Szerkesztés"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => handleDelete(t.id)}
                      aria-label="Törlés"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TransportFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        participantOptions={participants}
        transport={editing ?? undefined}
        onSaved={onRefresh}
      />
    </div>
  );
}
