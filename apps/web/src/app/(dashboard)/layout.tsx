import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConfigErrorPanel } from "@/components/config-error-panel";
import { FamilyLinkNotifications } from "@/components/family/family-link-notifications";
import { MemberAvatarProvider, MemberAvatarOwnFamilyHydrator } from "@/components/member-avatar-provider";
import { probeDatabase, validateAppEnv } from "@/lib/env";
import {
  fetchPendingFamilyLinkRequests,
  fetchUnseenFamilyLinkProposalOutcomes,
} from "@/lib/queries/family-links";
import { fetchTripsList } from "@/lib/queries/trips";
import { fetchCommandPaletteIndex } from "@/lib/queries/command-palette";

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const envError = validateAppEnv();
  if (envError) {
    return <ConfigErrorPanel message={envError} />;
  }

  let incomingRequests: Awaited<ReturnType<typeof fetchPendingFamilyLinkRequests>> = [];
  let proposalOutcomes: Awaited<ReturnType<typeof fetchUnseenFamilyLinkProposalOutcomes>> = [];
  let tripCommands: { id: string; title: string; destination: string }[] = [];
  let searchItems: Awaited<ReturnType<typeof fetchCommandPaletteIndex>> = [];

  try {
    const [dbError, requests, outcomes, trips, palette] = await Promise.all([
      probeDatabase(),
      fetchPendingFamilyLinkRequests(),
      fetchUnseenFamilyLinkProposalOutcomes(),
      fetchTripsList(),
      fetchCommandPaletteIndex(),
    ]);

    if (dbError) {
      return <ConfigErrorPanel message={dbError} />;
    }

    incomingRequests = requests;
    proposalOutcomes = outcomes;
    tripCommands = trips
      .filter((trip) => !trip.isTemplate)
      .map((trip) => ({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
      }));
    searchItems = palette;
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    console.error("[DashboardLayout] fetch failed:", err);
    const dbError = await probeDatabase();
    if (dbError) {
      return <ConfigErrorPanel message={dbError} />;
    }
  }

  return (
    <DashboardLayout trips={tripCommands} searchItems={searchItems}>
      {/* Avatar URL-ök nem-blokkolóan (MemberAvatarOwnFamilyHydrator) — layout soha ne várjon signed URL-re */}
      <MemberAvatarProvider>
        <MemberAvatarOwnFamilyHydrator />
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <FamilyLinkNotifications
            incomingRequests={incomingRequests}
            proposalOutcomes={proposalOutcomes}
          />
          {children}
        </div>
      </MemberAvatarProvider>
    </DashboardLayout>
  );
}
