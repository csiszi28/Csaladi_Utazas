import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConfigErrorPanel } from "@/components/config-error-panel";
import { FamilyLinkNotifications } from "@/components/family/family-link-notifications";
import { probeDatabase, validateAppEnv } from "@/lib/env";
import {
  fetchPendingFamilyLinkRequests,
  fetchUnseenFamilyLinkProposalOutcomes,
} from "@/lib/queries/family-links";
import { fetchTripsList } from "@/lib/queries/trips";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const envError = validateAppEnv();
  if (envError) {
    return <ConfigErrorPanel message={envError} />;
  }

  const dbError = await probeDatabase();
  if (dbError) {
    return <ConfigErrorPanel message={dbError} />;
  }

  let incomingRequests: Awaited<ReturnType<typeof fetchPendingFamilyLinkRequests>> = [];
  let proposalOutcomes: Awaited<ReturnType<typeof fetchUnseenFamilyLinkProposalOutcomes>> = [];
  let tripCommands: { id: string; title: string; destination: string }[] = [];

  try {
    const [requests, outcomes, trips] = await Promise.all([
      fetchPendingFamilyLinkRequests(),
      fetchUnseenFamilyLinkProposalOutcomes(),
      fetchTripsList(),
    ]);
    incomingRequests = requests;
    proposalOutcomes = outcomes;
    tripCommands = trips
      .filter((trip) => !trip.isTemplate)
      .map((trip) => ({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
      }));
  } catch (err) {
    console.error("[DashboardLayout] fetch failed:", err);
  }

  return (
    <DashboardLayout trips={tripCommands}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <FamilyLinkNotifications
          incomingRequests={incomingRequests}
          proposalOutcomes={proposalOutcomes}
        />
        {children}
      </div>
    </DashboardLayout>
  );
}
