import { describe, expect, it } from "vitest";
import { buildTripSettlement } from "../settlement";

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
