"use client";

import { useMemo } from "react";
import { Check, Circle } from "lucide-react";
import {
  buildMemberDocumentChecklist,
  overallMemberChecklistPercent,
  DOCUMENT_CATEGORY_LABELS,
  TRIP_DOCUMENT_CHECKLIST,
  type DocumentCategory,
} from "@csaladi-utazas/shared";
import { cn } from "@/lib/utils";

interface DocumentChecklistPanelProps {
  documents: {
    category: string;
    programId?: string | null;
    familyMemberId?: string | null;
  }[];
  participants: { id: string; name: string }[];
}

export function DocumentChecklistPanel({
  documents,
  participants,
}: DocumentChecklistPanelProps) {
  const rows = useMemo(
    () => buildMemberDocumentChecklist(participants, documents, true),
    [documents, participants]
  );
  const percent = overallMemberChecklistPercent(rows);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Indulás előtti dokumentumok családtagonként
        </p>
        <span className="text-sm font-medium">{percent}% kész (átlag)</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent === 100 ? "bg-emerald-500" : percent >= 50 ? "bg-primary" : "bg-amber-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Családtag</th>
              {TRIP_DOCUMENT_CHECKLIST.map((category) => (
                <th key={category} className="px-3 py-2.5 font-medium">
                  {DOCUMENT_CATEGORY_LABELS[category]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium">Kész</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.familyMemberId} className="border-b last:border-b-0">
                <td className="px-3 py-2.5 font-medium">{row.memberName}</td>
                {row.items.map((item) => (
                  <td key={item.category} className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {item.uploaded ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      {item.uploaded && item.documentCount > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {item.documentCount}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                  {row.completionPercent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        A „Teljes család (közös)” feltöltés mindenkinél teljesítettnek számít az adott
        kategóriában ({Object.values(DOCUMENT_CATEGORY_LABELS).slice(0, 3).join(", ")}…).
      </p>
    </div>
  );
}

export function documentCategoryLabel(category: string) {
  return DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category;
}
