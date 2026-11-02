import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConfigErrorPanel } from "@/components/config-error-panel";
import { FamilyLinkNotificationsLoader } from "@/components/family/family-link-notifications-loader";
import { MemberAvatarProvider, MemberAvatarOwnFamilyHydrator } from "@/components/member-avatar-provider";
import { probeDatabase, validateAppEnv } from "@/lib/env";
import { requireAuthUserId } from "@/lib/auth";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const envError = validateAppEnv();
  if (envError) {
    return <ConfigErrorPanel message={envError} />;
  }

  // Kritikus útvonal: csak hitelesítés + (60 mp-ig gyorsítótárazott) DB-próba.
  // Keresési index és családi értesítések nem blokkolnak (lásd search-index API, Suspense).
  await requireAuthUserId();
  const dbError = await probeDatabase();
  if (dbError) {
    return <ConfigErrorPanel message={dbError} />;
  }

  return (
    <DashboardLayout>
      {/* Avatar URL-ök nem-blokkolóan (MemberAvatarOwnFamilyHydrator) — layout soha ne várjon signed URL-re */}
      <MemberAvatarProvider>
        <MemberAvatarOwnFamilyHydrator />
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Suspense fallback={null}>
            <FamilyLinkNotificationsLoader />
          </Suspense>
          {children}
        </div>
      </MemberAvatarProvider>
    </DashboardLayout>
  );
}
