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

export const familyMemberSchema = z.object({
  name: z.string().min(1, "A név kötelező").max(100),
});

export const createFamilyMemberSchema = familyMemberSchema;
export const updateFamilyMemberSchema = familyMemberSchema.extend({
  id: z.string().uuid(),
});

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

export const costSchema = z.object({
  tripId: z.string().uuid(),
  programId: z.string().uuid().optional().nullable(),
  amount: z.number().positive("Az összegnek pozitívnak kell lennie"),
  currency: z.enum(CURRENCIES).default("HUF"),
  amountScope: z.enum(IDEA_AMOUNT_SCOPES).default("TOTAL"),
  category: z.enum(COST_CATEGORIES),
  title: z.string().min(1, "A megnevezés kötelező").max(200),
  paidByFamilyMemberId: z.string().uuid().optional().nullable(),
});

export const updateCostSchema = costSchema.extend({
  id: z.string().uuid(),
});

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
});

export const tripIdeaSchema = tripIdeaBaseSchema;

export const updateTripIdeaSchema = tripIdeaBaseSchema.extend({
  id: z.string().uuid(),
});

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

export const DOCUMENT_CATEGORIES = [
  "PASSPORT",
  "INSURANCE",
  "VOUCHER",
  "TICKET",
  "OTHER",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  PASSPORT: "Útlevél / személyi",
  INSURANCE: "Biztosítás",
  VOUCHER: "Szállás / voucher",
  TICKET: "Jegy",
  OTHER: "Egyéb",
};

/** Utazás szintű dokumentumokhoz ajánlott kategóriák (checklista) */
export const TRIP_DOCUMENT_CHECKLIST: DocumentCategory[] = [
  "PASSPORT",
  "INSURANCE",
  "VOUCHER",
];

export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

export const duplicateTripSchema = z.object({
  sourceTripId: z.string().uuid(),
  title: z.string().min(1).max(200),
  destination: z.string().min(1).max(200).optional(),
  startDate: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
  endDate: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
  copyPrograms: z.boolean().default(true),
  copyIdeas: z.boolean().default(true),
  copyBudget: z.boolean().default(true),
  shiftProgramDates: z.boolean().default(true),
});

export const claimFamilyMemberSchema = z.object({
  familyMemberId: z.string().uuid(),
  tripId: z.string().uuid(),
});

export const linkFamilyMemberSchema = z.object({
  familyMemberId: z.string().uuid(),
});

export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type TripInput = z.infer<typeof tripSchema>;
export type ProgramInput = z.infer<typeof programSchema>;
export type CostInput = z.infer<typeof costSchema>;
export type TripIdeaInput = z.infer<typeof tripIdeaSchema>;
export type DuplicateTripInput = z.infer<typeof duplicateTripSchema>;
