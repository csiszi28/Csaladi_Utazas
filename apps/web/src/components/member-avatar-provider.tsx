"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMemberAvatarUrlsAction,
  fetchOwnFamilyAvatarUrlsAction,
} from "@/actions/avatars";

type MemberAvatarContextValue = {
  urls: Record<string, string>;
  mergeUrls: (next: Record<string, string>) => void;
};

const MemberAvatarContext = createContext<MemberAvatarContextValue>({
  urls: {},
  mergeUrls: () => undefined,
});

export function MemberAvatarProvider({
  urls: initialUrls = {},
  children,
}: {
  urls?: Record<string, string>;
  children: ReactNode;
}) {
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);

  const mergeUrls = useCallback((next: Record<string, string>) => {
    if (Object.keys(next).length === 0) return;
    setUrls((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const [key, value] of Object.entries(next)) {
        if (merged[key] !== value) {
          merged[key] = value;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, []);

  useEffect(() => {
    mergeUrls(initialUrls);
  }, [initialUrls, mergeUrls]);

  const value = useMemo(() => ({ urls, mergeUrls }), [urls, mergeUrls]);

  return (
    <MemberAvatarContext.Provider value={value}>{children}</MemberAvatarContext.Provider>
  );
}

export function useMemberAvatarUrl(memberId: string | null | undefined): string | null {
  const { urls } = useContext(MemberAvatarContext);
  if (!memberId) return null;
  return urls[memberId] ?? null;
}

export function useMemberAvatarMap(): Record<string, string> {
  return useContext(MemberAvatarContext).urls;
}

/** Layout: saját család avatarjai a festés után. */
export function MemberAvatarOwnFamilyHydrator() {
  const { mergeUrls } = useContext(MemberAvatarContext);

  useEffect(() => {
    let cancelled = false;
    void fetchOwnFamilyAvatarUrlsAction()
      .then((next) => {
        if (!cancelled) mergeUrls(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mergeUrls]);

  return null;
}

/** Oldal: adott családtagok / linked userek avatarjai. */
export function MemberAvatarHydrator({
  members,
}: {
  members: Array<{ id: string; linkedUserId: string | null }>;
}) {
  const { mergeUrls } = useContext(MemberAvatarContext);
  const fingerprint = members
    .map((m) => `${m.id}:${m.linkedUserId ?? ""}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (members.length === 0) return;
    let cancelled = false;
    void fetchMemberAvatarUrlsAction(members)
      .then((next) => {
        if (!cancelled) mergeUrls(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // fingerprint stabilizálja a members tömböt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, mergeUrls]);

  return null;
}
