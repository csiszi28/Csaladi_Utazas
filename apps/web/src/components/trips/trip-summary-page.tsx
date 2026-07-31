"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Printer, Share2, Copy, CalendarDays, MapPin, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { TripBudgetPanel } from "@/components/trips/trip-budget-panel";
import type { TripDetailRow } from "@/lib/queries/trips";

interface SummaryPhoto {
  id: string;
  url: string | null;
  fileName: string;
}

interface TripSummaryPageProps {
  trip: TripDetailRow;
  coverUrl: string | null;
  photos: SummaryPhoto[];
}

export function TripSummaryPage({ trip, coverUrl, photos }: TripSummaryPageProps) {
  const [canShare, setCanShare] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setShareUrl(typeof window !== "undefined" ? window.location.href : "");
  }, []);

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    if (canShare) {
      try {
        await navigator.share({ title: trip.title, url: shareUrl });
      } catch {
        // user cancelled the share sheet — no action needed
      }
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link a vágólapra másolva");
  }

  const sortedPrograms = [...trip.programs].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  const validPhotos = photos.filter((p) => p.url);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/trips/${trip.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Vissza az utazáshoz
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            {canShare ? (
              <Share2 className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {canShare ? "Megosztás" : "Link másolása"}
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Nyomtatás
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm print:border-0 print:shadow-none">
        {coverUrl ? (
          <div className="relative h-48 w-full sm:h-64">
            <Image src={coverUrl} alt={trip.title} fill className="object-cover" unoptimized />
          </div>
        ) : null}
        <div className="space-y-3 p-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{trip.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {trip.destination}
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </p>
          {trip.participants.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Résztvevők</p>
              <MonogramGroup names={trip.participants.map((p) => p.familyMember.name)} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm print:border-0 print:shadow-none">
        <h2 className="text-lg font-semibold">Programok</h2>
        {sortedPrograms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Még nincsenek rögzített programok.</p>
        ) : (
          <ul className="divide-y">
            {sortedPrograms.map((program) => (
              <li key={program.id} className="flex items-start gap-3 py-2.5">
                <div className="w-24 shrink-0 text-sm text-muted-foreground">
                  {formatDate(program.date)}
                  {program.startTime ? (
                    <span className="block">{program.startTime}</span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{program.title}</p>
                  {program.location ? (
                    <p className="text-sm text-muted-foreground">{program.location}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm print:border-0 print:shadow-none">
        <h2 className="text-lg font-semibold">Költségvetés</h2>
        <TripBudgetPanel trip={trip} />
      </section>

      {validPhotos.length > 0 ? (
        <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm print:border-0 print:shadow-none">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            <ImageIcon className="h-4 w-4" />
            Fotók
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {validPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs are short-lived and not worth Next/Image optimization here */}
                <img
                  src={photo.url ?? undefined}
                  alt={photo.fileName}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
