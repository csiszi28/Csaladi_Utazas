export function PageSkeleton({ titleWidth = "w-48" }: { titleWidth?: string }) {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className={`h-8 rounded-md bg-muted ${titleWidth}`} />
        <div className="h-4 w-full max-w-lg rounded-md bg-muted" />
      </div>
      <div className="h-[420px] rounded-lg border bg-muted/40" />
    </div>
  );
}
