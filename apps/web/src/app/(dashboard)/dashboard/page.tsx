import { ReportsPage } from "@/components/reports/reports-page";
import { fetchReportsData } from "@/lib/queries/reports";

export default async function DashboardRoute() {
  const data = await fetchReportsData();

  return <ReportsPage data={data} />;
}
