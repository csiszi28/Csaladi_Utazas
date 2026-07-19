"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Filter } from "lucide-react";
import {
  ALL_DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from "@csaladi-utazas/shared";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentViewer } from "@/components/documents/document-viewer";
import type { DocumentItem } from "@/components/documents/document-upload";
import type { DocumentsOverviewTrip } from "@/lib/queries/documents";
import { getDocumentSignedUrl, deleteDocument } from "@/actions/documents";
import { getCachedDocumentUrl, invalidateDocumentUrl } from "@/lib/document-url-cache";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ALL = "__all__";
const TRIP_LEVEL = "__trip__";

async function fetchSignedUrl(documentId: string) {
  return getDocumentSignedUrl(documentId);
}

export function DocumentsPage({ trips }: { trips: DocumentsOverviewTrip[] }) {
  const [tripFilter, setTripFilter] = useState(ALL);
  const [programFilter, setProgramFilter] = useState(ALL);
  const [memberFilter, setMemberFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | undefined>();

  const totalCount = useMemo(
    () =>
      trips.reduce(
        (sum, trip) => sum + trip.documents.filter((d) => d.category !== "PHOTO").length,
        0
      ),
    [trips]
  );

  const selectedTrip = useMemo(
    () => (tripFilter === ALL ? null : trips.find((t) => t.id === tripFilter)),
    [tripFilter, trips]
  );

  const programOptions = selectedTrip?.programs ?? [];

  const memberOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    const sourceTrips = selectedTrip ? [selectedTrip] : trips;
    for (const trip of sourceTrips) {
      for (const p of trip.participants) {
        byId.set(p.familyMember.id, {
          id: p.familyMember.id,
          name: p.familyMember.name,
        });
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "hu"));
  }, [selectedTrip, trips]);

  const filteredRows = useMemo(() => {
    const rows: Array<{
      trip: DocumentsOverviewTrip;
      doc: DocumentsOverviewTrip["documents"][number];
    }> = [];

    for (const trip of trips) {
      if (tripFilter !== ALL && trip.id !== tripFilter) continue;

      for (const doc of trip.documents) {
        if (doc.category === "PHOTO") continue;
        if (programFilter === TRIP_LEVEL && doc.programId) continue;
        if (programFilter !== ALL && programFilter !== TRIP_LEVEL && doc.programId !== programFilter) {
          continue;
        }
        if (memberFilter !== ALL && doc.familyMemberId !== memberFilter) continue;
        if (categoryFilter !== ALL && doc.category !== categoryFilter) continue;
        rows.push({ trip, doc });
      }
    }

    return rows;
  }, [trips, tripFilter, programFilter, memberFilter, categoryFilter]);

  const displayDocs: DocumentItem[] = filteredRows.map(({ doc }) => ({
    id: doc.id,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.uploadedAt,
    programId: doc.programId,
    familyMemberId: doc.familyMemberId,
    category: doc.category,
  }));

  const tripTitleByDocId = useMemo(
    () => new Map(filteredRows.map(({ trip, doc }) => [doc.id, trip.title])),
    [filteredRows]
  );

  const participantNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of trips) {
      for (const p of trip.participants) {
        map.set(p.familyMember.id, p.familyMember.name);
      }
    }
    return map;
  }, [trips]);

  const programTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of trips) {
      for (const program of trip.programs) {
        map.set(program.id, program.title);
      }
    }
    return map;
  }, [trips]);

  function openViewer(documentId: string) {
    setViewerDocId(documentId);
    setViewerOpen(true);
  }

  async function handleDownload(documentId: string) {
    try {
      const url = await getCachedDocumentUrl(fetchSignedUrl, documentId);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Letöltési hiba");
    }
  }

  function handleDelete(documentId: string) {
    invalidateDocumentUrl(documentId);
    deleteDocument(documentId).then((result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Dokumentum törölve");
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dokumentumok</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {totalCount} fájl az összes elérhető utazásból — szűrj utazás, program, személy vagy
              kategória szerint. A fotók a Fotók menüben találhatók.
            </p>
          </div>
        </div>
      </section>

      <section className="min-w-0 space-y-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Szűrők
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 space-y-1.5">
            <Label>Utazás</Label>
            <Select
              value={tripFilter}
              onValueChange={(v) => {
                setTripFilter(v);
                setProgramFilter(ALL);
              }}
            >
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="Összes utazás" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Összes utazás</SelectItem>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label>Program</Label>
            <Select
              value={programFilter}
              onValueChange={setProgramFilter}
              disabled={tripFilter === ALL}
            >
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="Összes program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Összes program</SelectItem>
                <SelectItem value={TRIP_LEVEL}>Csak utazás szintű</SelectItem>
                {programOptions.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label>Személy</Label>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="Mindenki" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mindenki</SelectItem>
                {memberOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label>Kategória</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="Minden kategória" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Minden kategória</SelectItem>
                {ALL_DOCUMENT_CATEGORIES.filter((cat) => cat !== "PHOTO").map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DOCUMENT_CATEGORY_LABELS[cat as DocumentCategory]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(tripFilter !== ALL ||
          programFilter !== ALL ||
          memberFilter !== ALL ||
          categoryFilter !== ALL) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setTripFilter(ALL);
              setProgramFilter(ALL);
              setMemberFilter(ALL);
              setCategoryFilter(ALL);
            }}
          >
            Szűrők törlése
          </Button>
        )}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        {displayDocs.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {totalCount === 0
                ? "Még nincsenek feltöltött dokumentumok."
                : "Nincs találat a szűrők alapján."}
            </p>
            {totalCount === 0 && (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/trips">Utazások megnyitása</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{displayDocs.length} dokumentum</p>
            <DocumentTable
              documents={displayDocs}
              participantNameById={participantNameById}
              programTitleById={programTitleById}
              tripTitleByDocId={tripTitleByDocId}
              onView={openViewer}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          </div>
        )}
      </section>

      <DocumentViewer
        documents={displayDocs}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        initialDocumentId={viewerDocId}
      />
    </div>
  );
}
