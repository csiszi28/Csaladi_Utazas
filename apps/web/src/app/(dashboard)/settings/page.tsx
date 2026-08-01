import { SettingsPage } from "@/components/settings/settings-page";
import { requireUser } from "@/lib/auth";

export default async function SettingsRoute() {
  const user = await requireUser();

  return (
    <SettingsPage
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
      }}
    />
  );
}
