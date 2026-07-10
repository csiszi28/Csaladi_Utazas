import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConfigErrorPanel } from "@/components/config-error-panel";
import { probeDatabase, validateAppEnv } from "@/lib/env";

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

  return <DashboardLayout>{children}</DashboardLayout>;
}
