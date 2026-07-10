import { describe, expect, it } from "vitest";
import { buildTripCostBreakdown, costTotalHuf, computeScopedAmounts } from "../cost-allocation";
import { buildTripBudgetSummary } from "../budget-summary";
import { buildTripSettlement } from "../settlement";
import { buildTripIcal } from "../ical";
import { buildDocumentChecklist, buildMemberDocumentChecklist } from "../document-checklist";
import { parseUrlPreviewFromHtml, validatePreviewUrl } from "../url-preview";
import { dayOffsetMs } from "../date-shift";

const rates = { HUF: 1, EUR: 400, USD: 370, AED: 110 };

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
