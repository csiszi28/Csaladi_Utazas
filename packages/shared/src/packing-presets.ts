/** Gyakori utazási / nyaralási csomagolási tételek (HU). */
export const PACKING_PRESET_GROUPS = [
  {
    id: "clothes",
    label: "Ruházat",
    items: [
      "Póló",
      "Ing",
      "Nadrág",
      "Rövidnadrág",
      "Szoknya",
      "Ruha",
      "Pulóver",
      "Kabát",
      "Fürdőnadrág",
      "Bikini / fürdőruha",
      "Alsónemű",
      "Zokni",
      "Pyjama",
    ],
  },
  {
    id: "shoes",
    label: "Cipő",
    items: ["Sportcipő", "Szandál", "Strandpapucs", "Elegáns cipő"],
  },
  {
    id: "hygiene",
    label: "Higiénia",
    items: [
      "Fogkefe",
      "Fogkrém",
      "Sampon",
      "Tusfürdő",
      "Deo",
      "Naptej",
      "Törölköző",
      "Fésű",
    ],
  },
  {
    id: "docs",
    label: "Iratok & pénz",
    items: [
      "Útlevél / személyi",
      "Jogosítvány",
      "Biztosítási kártya",
      "Bankkártya",
      "Készpénz",
      "Repülő-/vonatjegy",
      "Szállásfoglalás",
    ],
  },
  {
    id: "tech",
    label: "Technika",
    items: [
      "Telefon",
      "Töltő",
      "Powerbank",
      "Fülhallgató",
      "Adapter",
      "Fényképező",
    ],
  },
  {
    id: "other",
    label: "Egyéb",
    items: [
      "Napszemüveg",
      "Sapka / kalap",
      "Hátizsák",
      "Gyógyszer",
      "Könyv / tablet",
      "Útiokmány-másolat",
      "Vízpalack",
      "Esernyő",
    ],
  },
] as const;

export type PackingPresetGroupId = (typeof PACKING_PRESET_GROUPS)[number]["id"];
