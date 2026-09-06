"use client";

import { getMonogram } from "@csaladi-utazas/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemberAvatarUrl } from "@/components/member-avatar-provider";
import { cn } from "@/lib/utils";

interface MonogramProps {
  name: string;
  /** Családtag id — profilkép a MemberAvatarProvider-ből */
  memberId?: string | null;
  /** Fiók userId — collaborator / linked lookup (`user:{id}`) */
  userId?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string | null;
}

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-16 w-16 text-lg",
} as const;

export function Monogram({
  name,
  memberId,
  userId,
  className,
  size = "sm",
  imageUrl,
}: MonogramProps) {
  const byMember = useMemberAvatarUrl(memberId);
  const byUser = useMemberAvatarUrl(userId ? `user:${userId}` : null);
  const resolvedUrl = imageUrl ?? byMember ?? byUser;

  return (
    <Avatar title={name} className={cn(SIZE_CLASS[size], "cursor-default", className)}>
      {resolvedUrl ? <AvatarImage src={resolvedUrl} alt={name} /> : null}
      <AvatarFallback>{getMonogram(name)}</AvatarFallback>
    </Avatar>
  );
}

export interface MonogramMember {
  id?: string;
  userId?: string;
  name: string;
}

interface MonogramGroupProps {
  /** Preferáld: id + név a profilképekhez */
  members?: MonogramMember[];
  /** Legacy: csak nevek (nincs profilkép) */
  names?: string[];
  max?: number;
  className?: string;
}

export function MonogramGroup({ members, names, max = 4, className }: MonogramGroupProps) {
  const list: MonogramMember[] =
    members ?? names?.map((name) => ({ name })) ?? [];
  const visible = list.slice(0, max);
  const remaining = list.length - max;
  const hiddenNames = list.slice(max).map((m) => m.name);

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((member, index) => (
        <Monogram
          key={`${member.id ?? member.userId ?? member.name}-${index}`}
          name={member.name}
          memberId={member.id}
          userId={member.userId}
          className="ring-2 ring-background"
        />
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
