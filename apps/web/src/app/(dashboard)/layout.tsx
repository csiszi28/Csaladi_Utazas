import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConfigErrorPanel } from "@/components/config-error-panel";
import { FamilyLinkRequestPanel } from "@/components/family/family-link-request-panel";
import { probeDatabase, validateAppEnv } from "@/lib/env";
import { fetchPendingFamilyLinkRequests } from "@/lib/queries/family-links";

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

  let pendingLinkRequests: Awaited<ReturnType<typeof fetchPendingFamilyLinkRequests>> = [];
  try {
    pendingLinkRequests = await fetchPendingFamilyLinkRequests();
  } catch {
    // Pl. ha a pendingLinkUserId oszlop vagy a friss Prisma kliens még nincs telepítve
    pendingLinkRequests = [];
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FamilyLinkRequestPanel requests={pendingLinkRequests} />
        {children}
      </div>
    </DashboardLayout>
  );
}
