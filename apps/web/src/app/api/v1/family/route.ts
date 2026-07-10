import { jsonOk, withApiAuth } from "@/lib/api/handler";
import { fetchFamilyMembers } from "@/lib/queries/family";

export const GET = withApiAuth(async () => {
  const members = await fetchFamilyMembers();
  return jsonOk({ members });
});
