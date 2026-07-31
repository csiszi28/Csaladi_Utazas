export const TRIP_COLLABORATOR_ROLES = ["EDITOR", "VIEWER"] as const;
export type TripCollaboratorRole = (typeof TRIP_COLLABORATOR_ROLES)[number];

export const TRIP_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type TripRole = (typeof TRIP_ROLES)[number];

export const TRIP_ROLE_LABELS: Record<TripRole, string> = {
  OWNER: "Tulajdonos",
  EDITOR: "Szerkesztő",
  VIEWER: "Csak olvasás",
};

export const TRIP_COLLABORATOR_ROLE_LABELS: Record<TripCollaboratorRole, string> = {
  EDITOR: "Szerkesztő",
  VIEWER: "Csak olvasás",
};

export function normalizeCollaboratorRole(role: string | null | undefined): TripCollaboratorRole {
  return role === "VIEWER" ? "VIEWER" : "EDITOR";
}

export function canEditTrip(role: TripRole): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageCollaborators(role: TripRole): boolean {
  return role === "OWNER";
}

export function canManageTripSettings(role: TripRole): boolean {
  return role === "OWNER";
}
