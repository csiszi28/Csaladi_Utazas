import { describe, expect, it } from "vitest";
import { buildCostSettlementStatuses, buildRemainingTransfers, buildSettlementAliasMap, buildTripSettlement } from "../settlement";
import { applySettlementPayments } from "../settlement-payments";

const rates = { HUF: 1 } as Parameters<typeof buildTripSettlement>[1];

const participants = [
  { id: "anya", name: "Anya" },
  { id: "apa", name: "Apa" },
  { id: "benett", name: "Benett", isChild: true },
];

describe("elszámolás gyerekkel", () => {
  it("az '1 főre' költség a gyerekre is számít, a részét a felnőttek viszik", () => {
    const settlement = buildTripSettlement(
      {
        participants,
        programs: [],
        costs: [
          {
            id: "c1",
            title: "Belépő",
            amount: 1000,
            currency: "HUF",
            amountScope: "PER_PERSON",
            paidByFamilyMemberId: "anya",
          },
        ],
      },
      rates
    );

    // 3 fő × 1000 = 3000 Ft (nem 2000): Anya fizette, Anya és Apa fele-fele viseli
    const anya = settlement.balances.find((b) => b.id === "anya")!;
    const apa = settlement.balances.find((b) => b.id === "apa")!;
    expect(anya.balanceHuf).toBe(1500);
    expect(apa.balanceHuf).toBe(-1500);
    expect(settlement.balances.some((b) => b.id === "benett")).toBe(false);
  });

  it("az összesen megadott költség összege nem változik", () => {
    const settlement = buildTripSettlement(
      {
        participants,
        programs: [],
        costs: [
          {
            id: "c1",
            title: "Szállás",
            amount: 3000,
            currency: "HUF",
            amountScope: "TOTAL",
            paidByFamilyMemberId: "anya",
          },
        ],
      },
      rates
    );
    expect(settlement.balances.find((b) => b.id === "apa")!.balanceHuf).toBe(-1500);
  });
});

describe("elszámolás azonos fiókhoz kötött profilokkal", () => {
  // Két háztartás ugyanazt a személyt (fiók "u-anya") külön profilként tartja számon
  const dup = [
    { id: "anya-a", name: "Anya", linkedUserId: "u-anya", ownerUserId: "u-anya" },
    { id: "anya-b", name: "Anya", linkedUserId: "u-anya", ownerUserId: "u-apa" },
    { id: "apa", name: "Apa", linkedUserId: "u-apa", ownerUserId: "u-apa" },
  ];

  it("egy személyként számol, és az '1 főre' költség nem duplázódik", () => {
    const s = buildTripSettlement(
      {
        participants: dup,
        programs: [],
        costs: [
          {
            id: "c1",
            title: "Belépő",
            amount: 1000,
            currency: "HUF",
            amountScope: "PER_PERSON",
            paidByFamilyMemberId: "anya-a",
          },
        ],
      },
      rates
    );
    expect(s.balances).toHaveLength(2);
    expect(s.balances.find((b) => b.id === "anya-b")!.balanceHuf).toBe(1000);
    expect(s.balances.find((b) => b.id === "apa")!.balanceHuf).toBe(-1000);
    expect(s.transfers).toEqual([
      expect.objectContaining({ fromId: "apa", toId: "anya-b", amountHuf: 1000 }),
    ]);
  });

  it("a szállás résztvevői nem számolódnak kétszer", () => {
    const s = buildTripSettlement(
      {
        participants: dup,
        programs: [],
        accommodations: [{ id: "a1", participantIds: ["anya-a", "anya-b", "apa"] }],
        costs: [
          { id: "c1", title: "Szállás", amount: 2000, currency: "HUF", accommodationId: "a1", paidByFamilyMemberId: "apa" },
        ],
      },
      rates
    );
    expect(s.balances.find((b) => b.id === "apa")!.balanceHuf).toBe(1000);
  });

  it("a másik profilra rögzített kifizetés is levonódik", () => {
    const aliases = buildSettlementAliasMap(dup);
    const rest = applySettlementPayments(
      [{ fromId: "apa", fromName: "Apa", toId: "anya-b", toName: "Anya", amountHuf: 1000 }],
      [{ fromFamilyMemberId: "apa", toFamilyMemberId: "anya-a", amountHuf: 400 }],
      aliases
    );
    expect(rest[0]!.amountHuf).toBe(600);
  });
});

describe("gyerek részét a szülő viszi", () => {
  const family = [
    { id: "zsolt", name: "Zsolt", linkedUserId: "u-zsolt", ownerUserId: "u-zsolt" },
    { id: "gyerek", name: "Gyerek", isChild: true, ownerUserId: "u-zsolt" },
    { id: "b1", name: "B1", linkedUserId: "u-b1", ownerUserId: "u-b1" },
    { id: "b2", name: "B2", linkedUserId: "u-b2", ownerUserId: "u-b2" },
  ];

  it("a többiek a teljes létszámmal osztott összeget fizetik, a gyerek része a szülőé", () => {
    const s = buildTripSettlement(
      {
        participants: family,
        programs: [],
        costs: [
          { id: "c1", title: "Szállás", amount: 4000, currency: "HUF", paidByFamilyMemberId: "zsolt" },
        ],
      },
      rates
    );
    // 4 fő × 1000: Zsolt fizette 4000, magára + gyerekre 2000 jut → +2000
    expect(s.balances.find((b) => b.id === "zsolt")!.balanceHuf).toBe(2000);
    expect(s.balances.find((b) => b.id === "b1")!.balanceHuf).toBe(-1000);
    expect(s.balances.find((b) => b.id === "b2")!.balanceHuf).toBe(-1000);
  });
});

describe("költségenkénti állapot", () => {
  const two = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  const costs = [
    { id: "c1", title: "Egy", amount: 1000, currency: "HUF", paidByFamilyMemberId: "a" },
    { id: "c2", title: "Kettő", amount: 3000, currency: "HUF", paidByFamilyMemberId: "a" },
  ];
  const ctx = { participants: two, programs: [], costs };

  it("a kifizetés sorrendben fedezi a költségeket", () => {
    const st = buildCostSettlementStatuses(ctx, rates, [
      { fromFamilyMemberId: "b", toFamilyMemberId: "a", amountHuf: 500 },
    ]);
    expect(st.map((s) => s.status)).toEqual(["settled", "open"]);
    expect(st[1]!.owedHuf).toBe(1500);
  });

  it("részleges kifizetés", () => {
    const st = buildCostSettlementStatuses(ctx, rates, [
      { fromFamilyMemberId: "b", toFamilyMemberId: "a", amountHuf: 1000 },
    ]);
    expect(st.map((s) => s.status)).toEqual(["settled", "partial"]);
    expect(st[1]!.paidHuf).toBe(500);
  });

  it("ha minden rendezett, minden költség rendezett", () => {
    const st = buildCostSettlementStatuses(ctx, rates, [
      { fromFamilyMemberId: "b", toFamilyMemberId: "a", amountHuf: 2000 },
    ]);
    expect(st.every((s) => s.status === "settled")).toBe(true);
  });
});

describe("költséghez rendelt kifizetés", () => {
  const two = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  const ctx = {
    participants: two,
    programs: [],
    costs: [
      { id: "c1", title: "Egy", amount: 1000, currency: "HUF", paidByFamilyMemberId: "a" },
      { id: "c2", title: "Kettő", amount: 3000, currency: "HUF", paidByFamilyMemberId: "a" },
    ],
  };

  it("a második költség kifizetése nem a sorrendben elsőt jelöli", () => {
    const st = buildCostSettlementStatuses(ctx, rates, [
      { fromFamilyMemberId: "b", toFamilyMemberId: "a", amountHuf: 1500, costId: "c2" },
    ]);
    expect(st.map((s) => s.status)).toEqual(["open", "settled"]);
  });

  it("a költség tartozásán felüli rész az általános kifizetésekhez kerül", () => {
    const st = buildCostSettlementStatuses(ctx, rates, [
      { fromFamilyMemberId: "b", toFamilyMemberId: "a", amountHuf: 700, costId: "c1" },
    ]);
    expect(st[0]!.status).toBe("settled");
    expect(st[1]!.paidHuf).toBe(200);
  });

  it("a fennmaradó átutalás a kifizetett egyenleg szerint számolódik", () => {
    const balances = [
      { id: "a", name: "A", balanceHuf: 2000 },
      { id: "b", name: "B", balanceHuf: -2000 },
    ];
    const rest = buildRemainingTransfers(balances, [
      { fromFamilyMemberId: "b", toFamilyMemberId: "a", amountHuf: 500, costId: "c1" },
    ]);
    expect(rest).toEqual([expect.objectContaining({ fromId: "b", toId: "a", amountHuf: 1500 })]);
  });
});
