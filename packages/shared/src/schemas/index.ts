import { z } from "zod";
import { CURRENCIES } from "../currency";

export const COST_CATEGORIES = [
  "ACCOMMODATION",
  "TRANSPORT",
  "FOOD",
  "TICKET",
  "OTHER",
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  ACCOMMODATION: "Szállás",
  TRANSPORT: "Utazás",
  FOOD: "Étkezés",
  TICKET: "Belépőjegy",
  OTHER: "Egyéb",
};

export const IDEA_AMOUNT_SCOPES = ["PER_PERSON", "TOTAL"] as const;
export type IdeaAmountScope = (typeof IDEA_AMOUNT_SCOPES)[number];

export const IDEA_AMOUNT_SCOPE_LABELS: Record<IdeaAmountScope, string> = {
  PER_PERSON: "1 főre",
  TOTAL: "Összesen",
};

export const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const familyMemberBaseSchema = z.object({
  name: z.string().min(1, "A név kötelező").max(100),
  email: z.string().trim().max(200).optional(),
});

function withFamilyMemberEmailRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const email = (data as { email?: string }).email;
    if (email && email.length > 0) {
      const check = z.string().email().safeParse(email);
      if (!check.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Érvénytelen e-mail cím",
          path: ["email"],
        });
      }
    }
  });
}

export const familyMemberSchema = withFamilyMemberEmailRefine(familyMemberBaseSchema);
export const createFamilyMemberSchema = familyMemberSchema;
export const updateFamilyMemberSchema = withFamilyMemberEmailRefine(
  familyMemberBaseSchema.extend({ id: z.string().uuid() })
);

const tripBaseSchema = z.object({
  title: z.string().min(1, "A megnevezés kötelező").max(200),
  destination: z.string().min(1, "A desztináció kötelező").max(200),
  startDate: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  endDate: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  participantIds: z.array(z.string().uuid()).min(1, "Legalább egy résztvevő kötelező"),
  budgetAmount: z
    .number()
    .positive("A költségvetésnek pozitívnak kell lennie")
    .optional()
    .nullable(),
  budgetCurrency: z.enum(CURRENCIES).default("HUF"),
});

function tripDateRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (data: z.infer<typeof tripBaseSchema>) => {
      const [sy, sm, sd] = data.startDate.split(".").map(Number);
      const [ey, em, ed] = data.endDate.split(".").map(Number);
      return new Date(ey, em - 1, ed) >= new Date(sy, sm - 1, sd);
    },
    { message: "A záró dátum nem lehet korábbi a kezdő dátumnál", path: ["endDate"] }
  );
}

export const tripSchema = tripDateRefine(tripBaseSchema);

export const updateTripSchema = tripDateRefine(
  tripBaseSchema.extend({ id: z.string().uuid() })
);

export const programSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().min(1, "A cím kötelező").max(200),
  date: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  startTime: z.string().regex(timeRegex, "Érvénytelen időformátum (HH:MM)").optional().nullable(),
  endTime: z.string().regex(timeRegex, "Érvénytelen időformátum (HH:MM)").optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((v) => v === null || z.string().url().safeParse(v).success, {
      message: "Érvényes URL szükséges",
    }),
  participantIds: z.array(z.string().uuid()).min(1, "Legalább egy résztvevő kötelező"),
  ideaId: z.string().uuid().optional().nullable(),
});

export const updateProgramSchema = programSchema.extend({
  id: z.string().uuid(),
});

function accommodationDateRangeRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (data: { checkIn: string; checkOut: string }) => {
        const [siy, sim, sid] = data.checkIn.split(".").map(Number);
        const [eoy, eom, eod] = data.checkOut.split(".").map(Number);
        return new Date(eoy, eom - 1, eod) > new Date(siy, sim - 1, sid);
      },
      { message: "A kijelentkezés dátuma későbbi kell legyen a bejelentkezésnél", path: ["checkOut"] }
    );
}

const accommodationBaseSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().min(1, "A cím kötelező").max(200),
  checkIn: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  checkOut: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((v) => v === null || z.string().url().safeParse(v).success, {
      message: "Érvényes URL szükséges",
    }),
  location: z.string().max(300).optional().nullable(),
  note: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    }),
  participantIds: z.array(z.string().uuid()).min(1, "Legalább egy résztvevő kötelező"),
  ideaId: z.string().uuid().optional().nullable(),
});

export const accommodationSchema = accommodationDateRangeRefine(accommodationBaseSchema);

export const updateAccommodationSchema = accommodationDateRangeRefine(
  accommodationBaseSchema.extend({ id: z.string().uuid() })
);

export const TRANSPORT_TYPES = [
  "FLIGHT",
  "TRAIN",
  "BUS",
  "CAR",
  "FERRY",
  "OTHER",
] as const;

export type TransportType = (typeof TRANSPORT_TYPES)[number];

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  FLIGHT: "Repülő",
  TRAIN: "Vonat",
  BUS: "Busz",
  CAR: "Autó",
  FERRY: "Komp",
  OTHER: "Egyéb",
};

const optionalUrlSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine((v) => v === null || z.string().url().safeParse(v).success, {
    message: "Érvényes URL szükséges",
  });

const optionalNoteSchema = z
  .string()
  .max(5000)
  .optional()
  .nullable()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed === "" ? null : trimmed;
  });

const transportBaseSchema = z.object({
  tripId: z.string().uuid(),
  type: z.enum(TRANSPORT_TYPES).default("OTHER"),
  title: z.string().min(1, "A cím kötelező").max(200),
  departureDate: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  departureTime: z
    .string()
    .regex(timeRegex, "Érvénytelen időformátum (HH:MM)")
    .optional()
    .nullable(),
  arrivalDate: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)")
    .optional()
    .nullable(),
  arrivalTime: z
    .string()
    .regex(timeRegex, "Érvénytelen időformátum (HH:MM)")
    .optional()
    .nullable(),
  fromLocation: z.string().max(300).optional().nullable(),
  toLocation: z.string().max(300).optional().nullable(),
  bookingRef: z.string().max(100).optional().nullable(),
  url: optionalUrlSchema,
  note: optionalNoteSchema,
  participantIds: z.array(z.string().uuid()).min(1, "Legalább egy résztvevő kötelező"),
  ideaId: z.string().uuid().optional().nullable(),
});

export const transportSchema = transportBaseSchema;
export const updateTransportSchema = transportBaseSchema.extend({ id: z.string().uuid() });

const costBaseSchema = z.object({
  tripId: z.string().uuid(),
  programId: z.string().uuid().optional().nullable(),
  accommodationId: z.string().uuid().optional().nullable(),
  transportId: z.string().uuid().optional().nullable(),
  amount: z.number().positive("Az összegnek pozitívnak kell lennie"),
  currency: z.enum(CURRENCIES).default("HUF"),
  amountScope: z.enum(IDEA_AMOUNT_SCOPES).default("TOTAL"),
  category: z.enum(COST_CATEGORIES),
  title: z.string().min(1, "A megnevezés kötelező").max(200),
  paidByFamilyMemberId: z.string().uuid().optional().nullable(),
});

function costLinkRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (data) => {
      const links = [data.programId, data.accommodationId, data.transportId].filter(Boolean);
      return links.length <= 1;
    },
    {
      message: "Költség csak egy entitáshoz kapcsolható (program, szállás vagy közlekedés)",
      path: ["transportId"],
    }
  );
}

export const quickCostSchema = z.object({
  tripId: z.string().uuid(),
  amount: z.number().positive("Az összegnek pozitívnak kell lennie"),
  currency: z.enum(CURRENCIES).default("HUF"),
  category: z.enum(COST_CATEGORIES).default("OTHER"),
  title: z.string().max(200).optional().nullable(),
  paidByFamilyMemberId: z.string().uuid().optional().nullable(),
});

export const settlementPaymentSchema = z.object({
  tripId: z.string().uuid(),
  fromFamilyMemberId: z.string().uuid(),
  toFamilyMemberId: z.string().uuid(),
  amountHuf: z.number().int().positive("Az összegnek pozitívnak kell lennie"),
  note: optionalNoteSchema,
});

export const packingItemSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().min(1, "A megnevezés kötelező").max(200),
  quantity: z.number().int().min(1).max(99).optional().default(1),
  assigneeFamilyMemberId: z.string().uuid().optional().nullable(),
});

export const packingItemsBatchSchema = z.object({
  tripId: z.string().uuid(),
  assigneeFamilyMemberId: z.string().uuid().optional().nullable(),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        quantity: z.number().int().min(1).max(99).optional().default(1),
      })
    )
    .min(1)
    .max(40),
});

export const updatePackingItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(1).max(99).optional(),
  assigneeFamilyMemberId: z.string().uuid().optional().nullable(),
  isPacked: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const setTripParticipantsSchema = z.object({
  tripId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(1, "Legalább egy résztvevő kötelező"),
});

export const dismissReminderSchema = z.object({
  reminderKey: z.string().min(1).max(300),
});

export const costSchema = costLinkRefine(costBaseSchema);

export const updateCostSchema = costLinkRefine(
  costBaseSchema.extend({ id: z.string().uuid() })
);

const tripIdeaBaseSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().min(1, "A cím kötelező").max(200),
  url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    })
    .refine((v) => v === null || z.string().url().safeParse(v).success, {
      message: "Érvényes URL szükséges",
    }),
  amount: z.number().positive("Az összegnek pozitívnak kell lennie").optional().nullable(),
  currency: z.enum(CURRENCIES).default("HUF"),
  amountScope: z.enum(IDEA_AMOUNT_SCOPES).default("TOTAL"),
  category: z.enum(COST_CATEGORIES).default("OTHER"),
  date: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)")
    .optional()
    .nullable(),
  startTime: z.string().regex(timeRegex, "Érvénytelen időformátum (HH:MM)").optional().nullable(),
  endTime: z.string().regex(timeRegex, "Érvénytelen időformátum (HH:MM)").optional().nullable(),
  checkInDate: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)")
    .optional()
    .nullable(),
  checkOutDate: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)")
    .optional()
    .nullable(),
  interestedParticipantIds: z.array(z.string().uuid()).default([]),
});

function accommodationDateRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const checkIn = (data as { checkInDate?: string | null }).checkInDate;
    const checkOut = (data as { checkOutDate?: string | null }).checkOutDate;
    if (!checkIn && !checkOut) return;
    if (!checkIn || !checkOut) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A be- és kijelentkezés dátuma együtt kötelező",
        path: ["checkOutDate"],
      });
      return;
    }
    const [siy, sim, sid] = checkIn.split(".").map(Number);
    const [eoy, eom, eod] = checkOut.split(".").map(Number);
    if (new Date(eoy, eom - 1, eod) <= new Date(siy, sim - 1, sid)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A kijelentkezés dátuma későbbi kell legyen a bejelentkezésnél",
        path: ["checkOutDate"],
      });
    }
  });
}

export const tripIdeaSchema = accommodationDateRefine(tripIdeaBaseSchema);

export const updateTripIdeaSchema = accommodationDateRefine(
  tripIdeaBaseSchema.extend({ id: z.string().uuid() })
);

const accommodationIdeaBaseSchema = tripIdeaBaseSchema.extend({
  category: z.literal("ACCOMMODATION").default("ACCOMMODATION"),
  checkInDate: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
  checkOutDate: z
    .string()
    .regex(/^\d{4}\.\d{2}\.\d{2}$/, "Érvénytelen dátum formátum (YYYY.MM.DD)"),
});

export const accommodationIdeaSchema = accommodationDateRefine(accommodationIdeaBaseSchema);

export const updateAccommodationIdeaSchema = accommodationDateRefine(
  accommodationIdeaBaseSchema.extend({ id: z.string().uuid() })
);

export const toggleIdeaInterestSchema = z.object({
  ideaId: z.string().uuid(),
  familyMemberId: z.string().uuid(),
  interested: z.boolean(),
});

export const ideaMessageSchema = z.object({
  ideaId: z.string().uuid(),
  body: z.string().min(1, "Az üzenet nem lehet üres").max(2000),
});

export const updateIdeaNoteSchema = z.object({
  ideaId: z.string().uuid(),
  note: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = (v ?? "").trim();
      return trimmed === "" ? null : trimmed;
    }),
});

export const updateIdeaMessageSchema = z.object({
  id: z.string().uuid(),
  body: z.string().min(1, "Az üzenet nem lehet üres").max(2000),
});

export const deleteIdeaMessageSchema = z.object({
  id: z.string().uuid(),
});

export const loginSchema = z.object({
  email: z.string().email("Érvényes e-mail cím szükséges"),
  password: z.string().min(6, "A jelszó legalább 6 karakter"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "A név kötelező").max(100),
  email: z.string().email("Érvényes e-mail cím szükséges"),
  password: z.string().min(6, "A jelszó legalább 6 karakter"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Érvényes e-mail cím szükséges"),
});

/** Utazás szintű dokumentumok (útlevél, biztosítás stb.) */
export const TRIP_DOCUMENT_CATEGORIES = [
  "PASSPORT",
  "INSURANCE",
  "VOUCHER",
  "TICKET",
  "PHOTO",
  "OTHER",
] as const;

/** Programhoz kapcsolódó dokumentumok */
export const PROGRAM_DOCUMENT_CATEGORIES = [
  "PROGRAM_TICKET",
  "PROGRAM_BOOKING",
  "PROGRAM_MAP",
  "PROGRAM_INFO",
  "PROGRAM_RECEIPT",
  "OTHER",
] as const;

/** @deprecated Használd a TRIP_DOCUMENT_CATEGORIES-t */
export const DOCUMENT_CATEGORIES = TRIP_DOCUMENT_CATEGORIES;

export type TripDocumentCategory = (typeof TRIP_DOCUMENT_CATEGORIES)[number];
export type ProgramDocumentCategory = (typeof PROGRAM_DOCUMENT_CATEGORIES)[number];
export type DocumentCategory = TripDocumentCategory | ProgramDocumentCategory;

export const TRIP_DOCUMENT_CATEGORY_LABELS: Record<TripDocumentCategory, string> = {
  PASSPORT: "Útlevél / személyi",
  INSURANCE: "Biztosítás",
  VOUCHER: "Szállás / voucher",
  TICKET: "Jegy",
  PHOTO: "Fotó",
  OTHER: "Egyéb",
};

export const PROGRAM_DOCUMENT_CATEGORY_LABELS: Record<ProgramDocumentCategory, string> = {
  PROGRAM_TICKET: "Belépő / jegy",
  PROGRAM_BOOKING: "Foglalás / voucher",
  PROGRAM_MAP: "Térkép / helyszín",
  PROGRAM_INFO: "Programleírás / tájékoztató",
  PROGRAM_RECEIPT: "Nyugta / számla",
  OTHER: "Egyéb",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  ...TRIP_DOCUMENT_CATEGORY_LABELS,
  ...PROGRAM_DOCUMENT_CATEGORY_LABELS,
};

/** Összes érvényes kategória (szűrők, validáció) */
export const ALL_DOCUMENT_CATEGORIES = [
  "PASSPORT",
  "INSURANCE",
  "VOUCHER",
  "TICKET",
  "PHOTO",
  "PROGRAM_TICKET",
  "PROGRAM_BOOKING",
  "PROGRAM_MAP",
  "PROGRAM_INFO",
  "PROGRAM_RECEIPT",
  "OTHER",
] as const;

/** Utazás szintű dokumentumokhoz ajánlott kategóriák (checklista) */
export const TRIP_DOCUMENT_CHECKLIST: TripDocumentCategory[] = [
  "PASSPORT",
  "INSURANCE",
  "VOUCHER",
];

export const documentCategorySchema = z.enum(ALL_DOCUMENT_CATEGORIES);

export function getDocumentCategoriesForContext(
  context: "trip" | "program"
): readonly DocumentCategory[] {
  return context === "program" ? PROGRAM_DOCUMENT_CATEGORIES : TRIP_DOCUMENT_CATEGORIES;
}

export function getDefaultDocumentCategory(context: "trip" | "program"): DocumentCategory {
  return context === "program" ? "PROGRAM_TICKET" : "OTHER";
}

export const duplicateTripSchema = z.object({
  sourceTripId: z.string().uuid(),
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(200).optional(),
  startDate: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
  endDate: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
  copyPrograms: z.boolean().default(true),
  copyAccommodations: z.boolean().default(true),
  copyTransports: z.boolean().default(true),
  copyPacking: z.boolean().default(true),
  copyIdeas: z.boolean().default(true),
  copyBudget: z.boolean().default(true),
  shiftProgramDates: z.boolean().default(true),
});

export const TRIP_ACTIVITY_TYPES = [
  "PROGRAM_CREATED",
  "PROGRAM_UPDATED",
  "PROGRAM_DELETED",
  "ACCOMMODATION_CREATED",
  "ACCOMMODATION_UPDATED",
  "ACCOMMODATION_DELETED",
  "TRANSPORT_CREATED",
  "TRANSPORT_UPDATED",
  "TRANSPORT_DELETED",
  "COST_CREATED",
  "COST_UPDATED",
  "COST_DELETED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_DELETED",
  "PHOTO_UPLOADED",
  "PARTICIPANTS_UPDATED",
  "SETTLEMENT_PAYMENT",
  "PACKING_UPDATED",
  "COVER_UPDATED",
  "IDEA_CREATED",
] as const;

export type TripActivityType = (typeof TRIP_ACTIVITY_TYPES)[number];

export const claimFamilyMemberSchema = z.object({
  familyMemberId: z.string().uuid(),
  tripId: z.string().uuid(),
});

export const linkFamilyMemberSchema = z.object({
  familyMemberId: z.string().uuid(),
});

export const familyMemberLinkProposalSchema = z.object({
  familyMemberId: z.string().uuid(),
});

export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type TripInput = z.infer<typeof tripSchema>;
export type ProgramInput = z.infer<typeof programSchema>;
export type AccommodationInput = z.infer<typeof accommodationSchema>;
export type TransportInput = z.infer<typeof transportSchema>;
export type CostInput = z.infer<typeof costSchema>;
export type QuickCostInput = z.infer<typeof quickCostSchema>;
export type TripIdeaInput = z.infer<typeof tripIdeaSchema>;
export type AccommodationIdeaInput = z.infer<typeof accommodationIdeaSchema>;
export type DuplicateTripInput = z.infer<typeof duplicateTripSchema>;
export type SettlementPaymentInput = z.infer<typeof settlementPaymentSchema>;
export type PackingItemInput = z.infer<typeof packingItemSchema>;
