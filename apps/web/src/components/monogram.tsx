import { getMonogram } from "@csaladi-utazas/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MonogramProps {
  name: string;
  className?: string;
  size?: "sm" | "md";
}

export function Monogram({ name, className, size = "sm" }: MonogramProps) {
  return (
    <Avatar
      title={name}
      className={cn(size === "sm" ? "h-7 w-7" : "h-9 w-9", "cursor-default", className)}
    >
      <AvatarFallback>{getMonogram(name)}</AvatarFallback>
    </Avatar>
  );
}

interface MonogramGroupProps {
  names: string[];
  max?: number;
  className?: string;
}

export function MonogramGroup({ names, max = 4, className }: MonogramGroupProps) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;
  const hiddenNames = names.slice(max);

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((name, index) => (
        <Monogram key={`${name}-${index}`} name={name} className="ring-2 ring-background" />
      ))}
      {remaining > 0 && (
        <Avatar
          title={hiddenNames.join(", ")}
          className="h-7 w-7 cursor-default ring-2 ring-background"
        >
          <AvatarFallback className="text-[10px]">+{remaining}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
