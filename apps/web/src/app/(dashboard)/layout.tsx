import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConfigErrorPanel } from "@/components/config-error-panel";
import { FamilyLinkNotifications } from "@/components/family/family-link-notifications";
import { probeDatabase, validateAppEnv } from "@/lib/env";
import {
  fetchPendingFamilyLinkRequests,
  fetchUnseenFamilyLinkProposalOutcomes,
} from "@/lib/queries/family-links";

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

  try {
    [incomingRequests, proposalOutcomes] = await Promise.all([
      fetchPendingFamilyLinkRequests(),
      fetchUnseenFamilyLinkProposalOutcomes(),
    ]);
  } catch (err) {
    console.error("[FamilyLinkNotifications] fetch failed:", err);
  }

  return (
    <DashboardLayout>
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
