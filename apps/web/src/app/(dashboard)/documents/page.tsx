import { DocumentsPage } from "@/components/documents/documents-page";
import { fetchDocumentsOverview } from "@/lib/queries/documents";

export default async function DocumentsRoutePage() {
  const trips = await fetchDocumentsOverview();
  return <DocumentsPage trips={trips} />;
}
