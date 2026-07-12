import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function TripDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-4 sm:p-6">
          <PageSkeleton titleWidth="w-64" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-2xl border bg-muted/30" />
      <div className="h-12 animate-pulse rounded-xl border bg-muted/20" />
      <div className="h-[420px] animate-pulse rounded-2xl border bg-muted/30" />
    </div>
  );
}
