import { FamilyLinkNotifications } from "@/components/family/family-link-notifications";
import {
  fetchPendingFamilyLinkRequests,
  fetchUnseenFamilyLinkProposalOutcomes,
} from "@/lib/queries/family-links";

/** Szerveroldali streaming: az oldal tartalma nem várja meg ezeket a lekérdezéseket. */
export async function FamilyLinkNotificationsLoader() {
  try {
    const [incomingRequests, proposalOutcomes] = await Promise.all([
      fetchPendingFamilyLinkRequests(),
      fetchUnseenFamilyLinkProposalOutcomes(),
    ]);
    return (
      <FamilyLinkNotifications
        incomingRequests={incomingRequests}
        proposalOutcomes={proposalOutcomes}
      />
    );
  } catch (err) {
    console.error("[FamilyLinkNotificationsLoader] fetch failed:", err);
    return null;
  }
}
