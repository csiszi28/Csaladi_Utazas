import { describe, expect, it } from "vitest";
import { buildSettlementAliasMap, buildTripSettlement } from "../settlement";
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
