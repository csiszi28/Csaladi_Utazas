import { revalidateTag } from "next/cache";

export const USER_DATA_TAG = "user-data";

export function revalidateUserData(userId: string) {
  revalidateTag(`${USER_DATA_TAG}-${userId}`);
}
