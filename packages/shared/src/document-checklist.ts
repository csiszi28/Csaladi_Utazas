import {
  DOCUMENT_CATEGORY_LABELS,
  TRIP_DOCUMENT_CHECKLIST,
  type DocumentCategory,
} from "./schemas";

export interface DocumentChecklistItem {
  category: DocumentCategory;
  label: string;
  uploaded: boolean;
  documentCount: number;
}

export interface MemberDocumentChecklistRow {
  familyMemberId: string;
  memberName: string;
  items: DocumentChecklistItem[];
  completionPercent: number;
}

export type DocumentChecklistInput = {
  category: string;
  programId?: string | null;
  familyMemberId?: string | null;
};

export function buildDocumentChecklist(
  documents: DocumentChecklistInput[],
  tripLevelOnly = true
): DocumentChecklistItem[] {
  const tripDocs = tripLevelOnly
    ? documents.filter((d) => !d.programId)
    : documents;

  return TRIP_DOCUMENT_CHECKLIST.map((category) => {
    const matching = tripDocs.filter((d) => (d.category ?? "OTHER") === category);
    return {
      category,
      label: DOCUMENT_CATEGORY_LABELS[category],
      uploaded: matching.length > 0,
      documentCount: matching.length,
    };
  });
}

export function buildMemberDocumentChecklist(
  participants: { id: string; name: string }[],
  documents: DocumentChecklistInput[],
  tripLevelOnly = true
): MemberDocumentChecklistRow[] {
  const tripDocs = tripLevelOnly
    ? documents.filter((d) => !d.programId)
    : documents;

  return participants.map((member) => {
    const items = TRIP_DOCUMENT_CHECKLIST.map((category) => {
      const matching = tripDocs.filter(
        (d) =>
          (d.category ?? "OTHER") === category &&
          (d.familyMemberId === member.id || d.familyMemberId == null)
      );
      return {
        category,
        label: DOCUMENT_CATEGORY_LABELS[category],
        uploaded: matching.length > 0,
        documentCount: matching.length,
      };
    });

    return {
      familyMemberId: member.id,
      memberName: member.name,
      items,
      completionPercent: checklistCompletionPercent(items),
    };
  });
}

export function checklistCompletionPercent(items: DocumentChecklistItem[]): number {
  if (items.length === 0) return 100;
  const done = items.filter((i) => i.uploaded).length;
  return Math.round((done / items.length) * 100);
}

export function overallMemberChecklistPercent(rows: MemberDocumentChecklistRow[]): number {
  if (rows.length === 0) return 100;
  const sum = rows.reduce((acc, row) => acc + row.completionPercent, 0);
  return Math.round(sum / rows.length);
}
