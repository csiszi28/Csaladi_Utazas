export const TRIP_TYPES = ["CITY", "BEACH", "SKI", "NATURE", "OTHER"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  CITY: "Városi",
  BEACH: "Tengerpart / strand",
  SKI: "Sí / téli",
  NATURE: "Természet / túra",
  OTHER: "Egyéb",
};

/** Extra packing item titles keyed by trip type (merged with base presets in UI). */
export const TRIP_TYPE_PACKING_EXTRAS: Record<TripType, string[]> = {
  CITY: ["Városi térkép / offline térkép", "Múzeumkártya", "Kényelmes gyaloglócipő"],
  BEACH: ["Naptej SPF50", "Strandtörölköző", "Snorkel", "Hűtőtáska", "Szúnyogirtó"],
  SKI: ["Sísisak", "Szemüveg / síszemüveg", "Réteges ruházat", "Síkesztyű", "Meleg zokni"],
  NATURE: ["Túracipő", "Esőkabát", "Fejlámpa", "Ivóvíz", "Elsősegély csomag"],
  OTHER: [],
};

/** Soft document checklist extras by trip type (labels only; not hard DocumentCategory). */
export const TRIP_TYPE_DOCUMENT_EXTRAS: Record<TripType, string[]> = {
  CITY: ["Városi közlekedési jegy / bérlet"],
  BEACH: ["Strandbérlet / napozóágy foglalás"],
  SKI: ["Síbiztosítás", "Sípass / skipass"],
  NATURE: ["Nemzeti park belépő", "Túrautvonal nyomtatvány"],
  OTHER: [],
};

export function isTripType(value: string | null | undefined): value is TripType {
  return TRIP_TYPES.includes(value as TripType);
}
