"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadDocument, getDocumentSignedUrl, deleteDocument } from "@/actions/documents";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { DocumentTable } from "@/components/documents/document-table";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from "@csaladi-utazas/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  getCachedDocumentUrl,
  prefetchDocumentUrls,
  invalidateDocumentUrl,
} from "@/lib/document-url-cache";

export interface DocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date | string;
  programId?: string | null;
  familyMemberId?: string | null;
  category?: string;
  pending?: boolean;
}

interface DocumentUploadProps {
  tripId: string;
  programId?: string;
  documents: DocumentItem[];
  participantOptions?: { id: string; name: string }[];
  programTitleById?: Map<string, string>;
  onDocumentUploaded?: (document: DocumentItem) => void;
  onDocumentDeleted?: (documentId: string) => void;
  compact?: boolean;
}

const ALL_FAMILY_VALUE = "__all__";

async function fetchSignedUrl(documentId: string) {
  return getDocumentSignedUrl(documentId);
}

export function DocumentUpload({
  tripId,
  programId,
  documents,
  participantOptions = [],
  programTitleById,
  onDocumentUploaded,
  onDocumentDeleted,
  compact = false,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploads, setPendingUploads] = useState<DocumentItem[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>(
    programId ? "TICKET" : "OTHER"
  );
  const [familyMemberId, setFamilyMemberId] = useState(ALL_FAMILY_VALUE);

  const participantNameById = useMemo(
    () => new Map(participantOptions.map((p) => [p.id, p.name])),
    [participantOptions]
  );

  const displayDocs = useMemo(() => {
    const seen = new Set<string>();
    return [...pendingUploads, ...documents].filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
  }, [pendingUploads, documents]);

  const readyDocs = useMemo(
    () => displayDocs.filter((doc) => !doc.pending && !doc.id.startsWith("temp-")),
    [displayDocs]
  );

  useEffect(() => {
    if (readyDocs.length === 0) return;
    prefetchDocumentUrls(
      fetchSignedUrl,
      readyDocs.map((doc) => doc.id)
    );
  }, [readyDocs]);

  useEffect(() => {
    if (!viewerOpen) return;
    if (readyDocs.length === 0) {
      setViewerOpen(false);
      setViewerDocId(undefined);
      return;
    }
    if (viewerDocId && !readyDocs.some((doc) => doc.id === viewerDocId)) {
      setViewerDocId(readyDocs[0]?.id);
    }
  }, [viewerOpen, viewerDocId, readyDocs]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const tooLarge = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (tooLarge.length > 0) {
      toast.error(
        tooLarge.length === 1
          ? `${tooLarge[0]!.name}: max. 10 MB / fájl`
          : `${tooLarge.length} fájl túl nagy (max. 10 MB)`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const uploadCategory = category;
    const uploadFamilyMemberId =
      familyMemberId === ALL_FAMILY_VALUE ? null : familyMemberId;

    const optimistic: DocumentItem[] = files.map((file) => ({
      id: `temp-${crypto.randomUUID()}`,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedAt: new Date(),
      programId: programId ?? null,
      familyMemberId: uploadFamilyMemberId,
      category: uploadCategory,
      pending: true,
    }));

    setPendingUploads((prev) => [...optimistic, ...prev]);
    setUploading(true);

    const results = await Promise.allSettled(
      files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tripId", tripId);
        if (programId) formData.append("programId", programId);
        formData.append("category", uploadCategory);
        formData.append("familyMemberId", familyMemberId);
        const result = await uploadDocument(formData);
        return { result, tempId: optimistic[index]!.id, file };
      })
    );

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    let successCount = 0;

    for (const entry of results) {
      if (entry.status !== "fulfilled") continue;
      const { result, tempId, file } = entry.value;
      setPendingUploads((prev) => prev.filter((doc) => doc.id !== tempId));

      if (result.success) {
        successCount++;
        onDocumentUploaded?.({
          id: result.data.id,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          uploadedAt: new Date(),
          programId: programId ?? null,
          familyMemberId: result.data.familyMemberId,
          category: result.data.category,
        });
      } else {
        const message =
          result.error?.includes("1 MB") || result.error?.includes("body")
            ? `${file.name}: a fájl túl nagy a feltöltéshez. Indítsd újra a dev szervert a legutóbbi frissítés után, vagy válassz kisebb fájlt (max. 10 MB).`
            : `${file.name}: ${result.error}`;
        toast.error(message);
      }
    }

    if (successCount > 0) {
      toast.success(
        successCount === 1 ? "Dokumentum feltöltve" : `${successCount} dokumentum feltöltve`
      );
    }
  }

  async function handleDownload(documentId: string) {
    try {
      const url = await getCachedDocumentUrl(fetchSignedUrl, documentId);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Letöltési hiba");
    }
  }

  function openViewer(documentId?: string) {
    setViewerDocId(documentId);
    setViewerOpen(true);
    if (documentId) {
      prefetchDocumentUrls(fetchSignedUrl, [documentId]);
    }
  }

  function handleDelete(documentId: string) {
    const deleted = documents.find((doc) => doc.id === documentId);
    if (!deleted) return;

    invalidateDocumentUrl(documentId);
    onDocumentDeleted?.(documentId);

    deleteDocument(documentId).then((result) => {
      if (!result.success) {
        onDocumentUploaded?.(deleted);
        toast.error(result.error);
      } else {
        toast.success("Dokumentum törölve");
      }
    });
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label className="text-xs">Dokumentum kategória</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger className="w-full min-w-0 max-w-full min-h-[var(--touch-target)] sm:min-h-9 [&>span]:line-clamp-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {DOCUMENT_CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {participantOptions.length > 0 && (
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs">Kinek szól?</Label>
            <Select value={familyMemberId} onValueChange={setFamilyMemberId}>
              <SelectTrigger className="w-full min-w-0 max-w-full min-h-[var(--touch-target)] sm:min-h-9 [&>span]:line-clamp-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FAMILY_VALUE}>Teljes család (közös)</SelectItem>
                {participantOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading
            ? "Feltöltés folyamatban…"
            : "Kattints vagy húzd ide a fájlokat (PDF, PNG, JPEG, max 10 MB / fájl)"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {readyDocs.length > 0 && !compact && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => openViewer(readyDocs[0]?.id)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Összes megtekintése ({readyDocs.length})
        </Button>
      )}

      <DocumentTable
        documents={displayDocs}
        participantNameById={participantNameById}
        programTitleById={programTitleById}
        onView={openViewer}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />

      <DocumentViewer
        documents={readyDocs}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        initialDocumentId={viewerDocId}
      />
    </div>
  );
}
