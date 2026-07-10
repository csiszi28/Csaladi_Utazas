import { FamilyPage } from "@/components/family/family-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { requireAuthUserId } from "@/lib/auth";

export default async function FamilyRoute() {
  const [members, userId] = await Promise.all([fetchFamilyMembers(), requireAuthUserId()]);

  return <FamilyPage members={members} currentUserId={userId} />;
}
