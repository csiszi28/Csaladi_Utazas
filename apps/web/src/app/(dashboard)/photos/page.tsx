import { PhotosPage } from "@/components/photos/photos-page";
import { fetchDocumentsOverview } from "@/lib/queries/documents";

export default async function PhotosRoutePage() {
  const trips = await fetchDocumentsOverview();
  return <PhotosPage trips={trips} />;
}
