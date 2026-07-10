"use client";

import { Download, Eye, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentCategoryLabel } from "@/components/documents/document-checklist-panel";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/components/documents/document-upload";

interface DocumentTableProps {
  documents: DocumentItem[];
  participantNameById?: Map<string, string>;
  programTitleById?: Map<string, string>;
  onView: (documentId: string) => void;
  onDownload: (documentId: string) => void;
  onDelete: (documentId: string) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function memberLabel(
  doc: DocumentItem,
  participantNameById?: Map<string, string>
) {
  if (!doc.familyMemberId) return "Teljes család";
  return participantNameById?.get(doc.familyMemberId) ?? "Ismeretlen";
}

export function DocumentTable({
  documents,
  participantNameById,
  programTitleById,
  onView,
  onDownload,
  onDelete,
}: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Még nincsenek feltöltött dokumentumok.
      </p>
    );
  }

  const actionClass = "h-8 w-8 shrink-0";

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Fájl</th>
            <th className="px-3 py-2.5 font-medium">Kategória</th>
            <th className="px-3 py-2.5 font-medium">Kinek</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Program</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Méret</th>
            <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Dátum</th>
            <th className="px-3 py-2.5 text-right font-medium">Műveletek</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className={cn(
                "border-b last:border-b-0",
                doc.pending && "opacity-60"
              )}
            >
              <td className="px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{doc.fileName}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {doc.pending
                    ? "Feltöltés…"
                    : documentCategoryLabel(doc.category ?? "OTHER")}
                </span>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {memberLabel(doc, participantNameById)}
              </td>
              <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                {doc.programId
                  ? programTitleById?.get(doc.programId) ?? "Program"
                  : "Utazás"}
              </td>
              <td className="hidden px-3 py-2.5 text-muted-foreground md:table-cell">
                {formatSize(doc.sizeBytes)}
              </td>
              <td className="hidden px-3 py-2.5 text-muted-foreground lg:table-cell">
                {new Date(doc.uploadedAt).toLocaleDateString("hu-HU")}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={actionClass}
                    onClick={() => onView(doc.id)}
                    disabled={doc.pending}
                    title="Megtekintés"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={actionClass}
                    onClick={() => onDownload(doc.id)}
                    disabled={doc.pending}
                    title="Letöltés"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={actionClass}
                    onClick={() => onDelete(doc.id)}
                    disabled={doc.pending}
                    title="Törlés"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
