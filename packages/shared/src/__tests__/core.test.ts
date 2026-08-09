import { describe, expect, it } from "vitest";
import { buildTripCostBreakdown, costTotalHuf, computeScopedAmounts } from "../cost-allocation";
import { buildTripBudgetSummary } from "../budget-summary";
import { buildTripSettlement } from "../settlement";
import { buildTripIcal } from "../ical";
import { buildDocumentChecklist, buildMemberDocumentChecklist } from "../document-checklist";
import { parseUrlPreviewFromHtml, validatePreviewUrl } from "../url-preview";
import { dayOffsetMs } from "../date-shift";
import {
  canEditTrip,
  canManageCollaborators,
  normalizeCollaboratorRole,
} from "../trip-roles";
import { buildUniqueTripPeople } from "../trip-people";
import { buildDayItinerary, listTripDays } from "../itinerary";
import { parseIcalToProgramCandidates } from "../ical-import";
import { buildReminders } from "../reminders";

const rates = { HUF: 1, EUR: 400, USD: 370, AED: 110, THB: 10 };

const baseTrip = {
  id: "trip-1",
  title: "Teszt",
  startDate: new Date(2026, 6, 1),
  endDate: new Date(2026, 6, 5),
  participants: [
    { id: "p1", name: "Anna" },
    { id: "p2", name: "Béla" },
  ],
  programs: [
    {
      id: "prog-1",
      title: "Program",
      date: new Date(2026, 6, 2),
      participantIds: ["p1", "p2"],
      costs: [
        {
          id: "c1",
          title: "Belépő",
          amount: 10000,
          currency: "HUF",
          amountScope: "TOTAL",
          category: "TICKET",
        },
      ],
    },
  ],
  tripLevelCosts: [],
};

describe("cost-allocation", () => {
  it("splits program cost between participants", () => {
    const breakdown = buildTripCostBreakdown(baseTrip, rates);
    expect(breakdown.totalHuf).toBeGreaterThan(0);
    expect(breakdown.perPerson).toHaveLength(2);
    const sum = breakdown.perPerson.reduce((s, p) => s + p.amountHuf, 0);
    expect(sum).toBe(breakdown.totalHuf);
  });

  it("handles per-person scope", () => {
    const total = costTotalHuf(
      { amount: 1000, currency: "HUF", amountScope: "PER_PERSON" },
      3,
      rates
    );
    expect(total).toBe(3000);
  });

  it("computes scoped amounts for display", () => {
    expect(computeScopedAmounts(1000, "PER_PERSON", 3)).toEqual({
      perPerson: 1000,
      total: 3000,
    });
    expect(computeScopedAmounts(3000, "TOTAL", 3)).toEqual({
      perPerson: 1000,
      total: 3000,
    });
    expect(computeScopedAmounts(1000, "TOTAL", 0)).toBeNull();
  });
});

describe("budget-summary", () => {
  it("computes estimated vs actual", () => {
    const summary = buildTripBudgetSummary(
      {
        budgetAmount: 100000,
        budgetCurrency: "HUF",
        participantCount: 2,
        ideas: [{ id: "i1", amount: 20000, currency: "HUF", amountScope: "TOTAL", interestedParticipantIds: [] }],
        actualTotalHuf: 50000,
      },
      rates
    );
    expect(summary.estimatedHuf).toBe(20000);
    expect(summary.actualHuf).toBe(50000);
    expect(summary.budgetHuf).toBe(100000);
    expect(summary.status).toBe("ok");
  });
});

describe("settlement", () => {
  it("produces transfers when payer is set", () => {
    const settlement = buildTripSettlement(
      {
        participants: baseTrip.participants,
        programs: [{ id: "prog-1", participantIds: ["p1", "p2"] }],
        costs: [
          {
            id: "c1",
            title: "Vacsi",
            amount: 10000,
            currency: "HUF",
            amountScope: "TOTAL",
            programId: "prog-1",
            paidByFamilyMemberId: "p1",
          },
        ],
      },
      rates
    );
    expect(settlement.settledCostCount).toBe(1);
    expect(settlement.transfers.length).toBeGreaterThan(0);
  });
});

describe("ical", () => {
  it("builds valid calendar output", () => {
    const ical = buildTripIcal({
      id: "t1",
      title: "Balaton",
      destination: "Siófok",
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 6, 3),
      programs: [
        {
          id: "p1",
          title: "Strand",
          date: new Date(2026, 6, 2),
          startTime: "10:00",
          endTime: "12:00",
          location: "Siófok",
        },
      ],
    });
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("Strand");
  });
});

describe("document-checklist", () => {
  it("marks uploaded categories", () => {
    const items = buildDocumentChecklist([
      { category: "PASSPORT", programId: null },
      { category: "OTHER", programId: null },
    ]);
    const passport = items.find((i) => i.category === "PASSPORT");
    expect(passport?.uploaded).toBe(true);
    expect(passport?.documentCount).toBe(1);
  });

  it("counts shared uploads for each family member", () => {
    const rows = buildMemberDocumentChecklist(
      [
        { id: "m1", name: "Anna" },
        { id: "m2", name: "Béla" },
      ],
      [{ category: "INSURANCE", programId: null, familyMemberId: null }]
    );
    expect(rows[0]?.items.find((i) => i.category === "INSURANCE")?.uploaded).toBe(true);
    expect(rows[1]?.items.find((i) => i.category === "INSURANCE")?.uploaded).toBe(true);
  });
});

describe("url-preview", () => {
  it("parses og tags", () => {
    const html = `<html><head>
      <meta property="og:title" content="Teszt oldal" />
      <meta property="og:description" content="Leírás" />
      <meta property="og:image" content="https://example.com/img.jpg" />
    </head></html>`;
    const preview = parseUrlPreviewFromHtml(html, "https://example.com");
    expect(preview.title).toBe("Teszt oldal");
    expect(preview.description).toBe("Leírás");
  });

  it("rejects private urls", () => {
    expect(validatePreviewUrl("http://localhost/test")).toBeNull();
  });
});

describe("date-shift", () => {
  it("calculates day offset", () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 8);
    expect(dayOffsetMs(from, to)).toBe(7 * 86_400_000);
  });
});

describe("trip-roles", () => {
  it("gates edit permissions", () => {
    expect(canEditTrip("OWNER")).toBe(true);
    expect(canEditTrip("EDITOR")).toBe(true);
    expect(canEditTrip("VIEWER")).toBe(false);
    expect(canManageCollaborators("OWNER")).toBe(true);
    expect(canManageCollaborators("EDITOR")).toBe(false);
    expect(normalizeCollaboratorRole("VIEWER")).toBe("VIEWER");
    expect(normalizeCollaboratorRole("weird")).toBe("EDITOR");
  });
});

describe("itinerary", () => {
  it("lists trip days and builds day timeline", () => {
    const days = listTripDays(new Date(2026, 6, 1), new Date(2026, 6, 3));
    expect(days).toEqual(["2026.07.01", "2026.07.02", "2026.07.03"]);

    const items = buildDayItinerary("2026.07.02", {
      programs: [
        {
          id: "p1",
          title: "Múzeum",
          date: new Date(2026, 6, 2),
          startTime: "10:00",
          location: "Belváros",
        },
      ],
      transports: [
        {
          id: "t1",
          title: "Vonat",
          departureDate: new Date(2026, 6, 2),
          departureTime: "08:30",
          fromLocation: "Bp",
          toLocation: "Győr",
        },
      ],
      accommodations: [
        {
          id: "a1",
          title: "Hotel",
          checkIn: new Date(2026, 6, 2),
          checkOut: new Date(2026, 6, 4),
          location: "Győr",
        },
      ],
    });

    expect(items.map((i) => i.kind)).toEqual([
      "accommodation_checkin",
      "transport",
      "program",
    ]);
  });
});

describe("ical-import", () => {
  it("parses VEVENT blocks", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Teszt program
DTSTART:20260702T100000
DTEND:20260702T120000
LOCATION:Budapest
END:VEVENT
END:VCALENDAR`;
    const candidates = parseIcalToProgramCandidates(ics);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.title).toBe("Teszt program");
    expect(candidates[0]?.date).toBe("2026.07.02");
    expect(candidates[0]?.startTime).toBe("10:00");
    expect(candidates[0]?.location).toBe("Budapest");
  });
});

describe("reminders-expansion", () => {
  it("emits trip start and idea voting reminders", () => {
    const now = new Date(2026, 5, 24);
    const reminders = buildReminders(
      [
        {
          id: "trip-1",
          title: "Nyár",
          startDate: new Date(2026, 6, 1),
          endDate: new Date(2026, 6, 5),
          ideaDeadlines: [
            {
              ideaId: "idea-1",
              ideaTitle: "Állatkert",
              voteDeadline: new Date(2026, 5, 24),
            },
          ],
        },
      ],
      [],
      now
    );
    expect(reminders.some((r) => r.kind === "trip_starts_soon")).toBe(true);
    expect(reminders.some((r) => r.kind === "idea_voting_deadline")).toBe(true);
  });

  it("maps removed-from-trip inbox notifications", async () => {
    const { mapInboxNotificationsToReminders } = await import("../reminders");
    const mapped = mapInboxNotificationsToReminders([
      {
        id: "n1",
        kind: "removed_from_trip",
        title: "Eltávolítva az utazásból",
        body: "Valaki eltávolított.",
        href: "/trips",
        tripId: "trip-1",
        tripTitle: "Nyár",
        createdAt: new Date(2026, 5, 24),
      },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.key).toBe("inbox:n1");
    expect(mapped[0]?.kind).toBe("removed_from_trip");
  });
});

describe("trip-people", () => {
  it("dedupes linked participant with collaborator and owner", () => {
    const people = buildUniqueTripPeople({
      participants: [
        { familyMember: { id: "fm-1", name: "Anna", linkedUserId: "u-anna", userId: "u-owner" } },
        { familyMember: { id: "fm-2", name: "Béla", linkedUserId: null, userId: "u-owner" } },
        // ugyanaz a személy saját FM-ként is (duplikátum)
        {
          familyMember: {
            id: "fm-anna-self",
            name: "Anna",
            linkedUserId: "u-anna",
            userId: "u-anna",
          },
        },
      ],
      collaborators: [
        { user: { id: "u-anna", name: "Anna", email: "anna@pelda.hu" }, role: "EDITOR" },
        { user: { id: "u-cecil", name: "Cecil", email: "cecil@pelda.hu" }, role: "VIEWER" },
      ],
      owner: { id: "u-owner", name: "Dóra", email: "dora@pelda.hu" },
    });

    expect(people).toHaveLength(4);

    const anna = people.find((p) => p.userId === "u-anna");
    expect(anna?.isParticipant).toBe(true);
    expect(anna?.isCollaborator).toBe(true);
    expect(people.some((p) => p.name === "Cecil" && p.isCollaborator)).toBe(true);
    expect(people.some((p) => p.name === "Dóra" && p.isOwner)).toBe(true);
  });

  it("marks collaborator as participant when own unlinked FM is on the trip", () => {
    const people = buildUniqueTripPeople({
      participants: [
        {
          familyMember: {
            id: "fm-attila",
            name: "Csiszár Attila",
            linkedUserId: null,
            userId: "u-attila",
          },
        },
      ],
      collaborators: [
        {
          user: { id: "u-attila", name: "Csiszár Attila", email: "attila@pelda.hu" },
          role: "EDITOR",
        },
      ],
      owner: { id: "u-owner", name: "Dóra", email: "dora@pelda.hu" },
    });

    expect(people).toHaveLength(2);
    const attila = people.find((p) => p.userId === "u-attila");
    expect(attila?.isParticipant).toBe(true);
    expect(attila?.isCollaborator).toBe(true);
  });
});
