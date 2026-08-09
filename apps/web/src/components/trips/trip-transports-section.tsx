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
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { useDeleteTransport } from "@/hooks/use-transports";
import type { TripDetailRow } from "@/lib/queries/trips";
import { TransportFormDrawer } from "./transport-form-drawer";
import { CostChips } from "./cost-chips";
import { TRIP_SECTION_BTN_CLASS } from "./trip-section-styles";
import { TripSectionHeading } from "./trip-detail-tabs";
import { TripMapView, buildTripMapMarkers } from "./trip-map-view";
import { GeocodeStatusBadge, resolveGeocodeStatus } from "./geocode-status";
import { TripSubviewNav } from "./trip-subview-nav";

type TransportRow = TripDetailRow["transports"][number];

interface TripTransportsSectionProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  transports: TransportRow[];
  participants: { id: string; name: string }[];
  costs: TripDetailRow["costs"];
  canEdit?: boolean;
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
  canEdit = true,
  onRefresh,
  openSignal = 0,
}: TripTransportsSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRow | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [localTransports, setLocalTransports] = useState(transports);
  const deleteMutation = useDeleteTransport();

  useEffect(() => {
    setLocalTransports(transports);
  }, [transports]);

  useEffect(() => {
    if (openSignal > 0) {
      setEditing(null);
      setDrawerOpen(true);
    }
  }, [openSignal]);

  return (
    <div className="space-y-4">
      <TripSectionHeading
        title="Közlekedés"
        action={
          canEdit ? (
            <Button
              type="button"
              className={`${TRIP_SECTION_BTN_CLASS} w-full sm:w-auto`}
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">Új</span>
              <span className="hidden sm:inline">Új közlekedés</span>
            </Button>
          ) : null
        }
      />

      <TripSubviewNav
        ariaLabel="Közlekedés nézet"
        active={view}
        onChange={(id) => setView(id as "list" | "map")}
        items={[
          { id: "list", label: "Lista", shortLabel: "Lista", count: localTransports.length },
          { id: "map", label: "Térkép", shortLabel: "Térkép" },
        ]}
      />

      {view === "map" ? (
        <TripMapView
          markers={buildTripMapMarkers({
            programs: [],
            accommodations: [],
            transports: localTransports,
          })}
          canEdit={canEdit}
          showNearbyToggle={false}
        />
      ) : localTransports.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Még nincsenek rögzített járatok vagy utak. Add hozzá a repülőjegyeket, vonatokat vagy
            autóutakat.
          </p>
          {canEdit ? (
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
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {localTransports.map((t) => {
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
                      {t.fromLocation ? (
                        <GeocodeStatusBadge
                          status={resolveGeocodeStatus({
                            location: t.fromLocation,
                            lat: t.fromLat,
                            lng: t.fromLng,
                          })}
                        />
                      ) : null}
                      {t.toLocation ? (
                        <GeocodeStatusBadge
                          status={resolveGeocodeStatus({
                            location: t.toLocation,
                            lat: t.toLat,
                            lng: t.toLng,
                          })}
                        />
                      ) : null}
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
                      <MonogramGroup names={t.participants.map((p) => p.familyMember.name)} />
                    </div>
                    {linkedCosts.length > 0 ? (
                      <div className="mt-2">
                        <CostChips
                          costs={linkedCosts}
                          participantCount={t.participants.length || 1}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    {t.url ? (
                      <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                        <a href={t.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditing(t);
                            setDrawerOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            const previous = localTransports;
                            setLocalTransports((prev) => prev.filter((x) => x.id !== t.id));
                            const result = await deleteMutation.mutateAsync(t.id);
                            if (!result.success) {
                              setLocalTransports(previous);
                              return;
                            }
                            onRefresh();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
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
