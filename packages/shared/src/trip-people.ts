/** Egy személy azonosítója az utazás névsorában (résztvevő ∪ közreműködő ∪ tulajdonos). */
export function tripPersonKey(input: {
  linkedUserId?: string | null;
  userId?: string | null;
  familyMemberId?: string | null;
}): string {
  if (input.linkedUserId) return `user:${input.linkedUserId}`;
  if (input.userId) return `user:${input.userId}`;
  if (input.familyMemberId) return `fm:${input.familyMemberId}`;
  return "unknown";
}

function normalizePersonName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export type TripPeopleParticipantInput = {
  familyMember: {
    id: string;
    name: string;
    linkedUserId?: string | null;
    /** A családtag rekord tulajdonosa (háztartás). */
    userId?: string | null;
  };
};

export type TripPeopleCollaboratorInput = {
  user: {
    id: string;
    name: string;
    email?: string | null;
  };
  role?: string;
};

export type TripPeopleOwnerInput = {
  id: string;
  name: string;
  email?: string | null;
};

export type UniqueTripPerson = {
  key: string;
  name: string;
  email?: string | null;
  familyMemberId?: string;
  userId?: string;
  ownerUserId?: string;
  isParticipant: boolean;
  isCollaborator: boolean;
  isOwner: boolean;
  collaboratorRole?: string;
};

/**
 * Résztvevők + közreműködők + tulajdonos, személyenként egyszer
 * (linkedUserId / userId alapján összevonva).
 */
export function buildUniqueTripPeople(input: {
  participants: TripPeopleParticipantInput[];
  collaborators?: TripPeopleCollaboratorInput[];
  owner?: TripPeopleOwnerInput | null;
}): UniqueTripPerson[] {
  const byKey = new Map<string, UniqueTripPerson>();

  const merge = (key: string, next: Omit<UniqueTripPerson, "key">) => {
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { key, ...next });
      return;
    }
    existing.isParticipant = existing.isParticipant || next.isParticipant;
    existing.isCollaborator = existing.isCollaborator || next.isCollaborator;
    existing.isOwner = existing.isOwner || next.isOwner;
    if (!existing.familyMemberId && next.familyMemberId) {
      existing.familyMemberId = next.familyMemberId;
    }
    if (!existing.userId && next.userId) {
      existing.userId = next.userId;
    }
    if (!existing.ownerUserId && next.ownerUserId) {
      existing.ownerUserId = next.ownerUserId;
    }
    if (!existing.email && next.email) {
      existing.email = next.email;
    }
    if (next.collaboratorRole) {
      existing.collaboratorRole = next.collaboratorRole;
    }
    // Preferáljuk a fiókhoz kötött nevet, ha a közreműködő / tulajdonos pontosabb
    if (next.userId && next.name) {
      existing.name = next.name;
    }
  };

  /** fm:* sorok beolvasztása user:* kulcs alá, ha ugyanaz a személy. */
  const absorbMatchingFmEntries = (userId: string, userName: string) => {
    const targetKey = tripPersonKey({ userId });
    const normalizedUserName = normalizePersonName(userName);
    const toAbsorb: string[] = [];

    for (const [key, person] of byKey) {
      if (!key.startsWith("fm:") || !person.isParticipant) continue;

      const fmName = normalizePersonName(person.name);
      const nameOverlaps =
        fmName === normalizedUserName ||
        (fmName.length >= 3 && normalizedUserName.includes(fmName)) ||
        (normalizedUserName.length >= 3 && fmName.includes(normalizedUserName));

      const ownedSelfProfile = person.ownerUserId === userId && nameOverlaps;
      const unlinkedVirtualMatch =
        !person.userId && person.ownerUserId !== userId && fmName === normalizedUserName;

      if (ownedSelfProfile || unlinkedVirtualMatch) {
        toAbsorb.push(key);
      }
    }

    for (const fmKey of toAbsorb) {
      const person = byKey.get(fmKey);
      if (!person) continue;
      byKey.delete(fmKey);
      merge(targetKey, {
        name: person.name,
        email: person.email,
        familyMemberId: person.familyMemberId,
        userId,
        ownerUserId: person.ownerUserId,
        isParticipant: true,
        isCollaborator: person.isCollaborator,
        isOwner: person.isOwner,
        collaboratorRole: person.collaboratorRole,
      });
    }
  };

  for (const p of input.participants) {
    const fm = p.familyMember;
    const key = tripPersonKey({
      linkedUserId: fm.linkedUserId,
      familyMemberId: fm.id,
    });
    merge(key, {
      name: fm.name,
      familyMemberId: fm.id,
      userId: fm.linkedUserId ?? undefined,
      ownerUserId: fm.userId ?? undefined,
      isParticipant: true,
      isCollaborator: false,
      isOwner: false,
    });
  }

  for (const c of input.collaborators ?? []) {
    absorbMatchingFmEntries(c.user.id, c.user.name);
    const key = tripPersonKey({ userId: c.user.id });
    merge(key, {
      name: c.user.name,
      email: c.user.email ?? null,
      userId: c.user.id,
      isParticipant: false,
      isCollaborator: true,
      isOwner: false,
      collaboratorRole: c.role,
    });
  }

  if (input.owner) {
    absorbMatchingFmEntries(input.owner.id, input.owner.name);
    const key = tripPersonKey({ userId: input.owner.id });
    merge(key, {
      name: input.owner.name,
      email: input.owner.email ?? null,
      userId: input.owner.id,
      isParticipant: false,
      isCollaborator: false,
      isOwner: true,
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "hu", { sensitivity: "base" })
  );
}

export function uniqueTripPeopleNames(input: {
  participants: TripPeopleParticipantInput[];
  collaborators?: TripPeopleCollaboratorInput[];
  owner?: TripPeopleOwnerInput | null;
}): string[] {
  return buildUniqueTripPeople(input).map((p) => p.name);
}

export function uniqueTripPeopleCount(input: {
  participants: TripPeopleParticipantInput[];
  collaborators?: TripPeopleCollaboratorInput[];
  owner?: TripPeopleOwnerInput | null;
}): number {
  return buildUniqueTripPeople(input).length;
}
