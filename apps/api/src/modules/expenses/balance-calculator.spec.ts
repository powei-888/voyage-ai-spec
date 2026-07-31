import { ExpenseStatus } from "@prisma/client";
import { calculateBalances } from "./balance-calculator";

describe("calculateBalances", () => {
  const members = [
    { id: "amy", displayName: "Amy" },
    { id: "tom", displayName: "Tom" },
    { id: "wei", displayName: "Wei" }
  ];

  it("aggregates multiple expenses and produces settlements", () => {
    const result = calculateBalances(
      members,
      [
        {
          amount: "3000",
          payerMemberId: "wei",
          status: ExpenseStatus.active,
          participants: [
            { memberId: "amy", shareAmount: "1000" },
            { memberId: "tom", shareAmount: "1000" },
            { memberId: "wei", shareAmount: "1000" }
          ]
        },
        {
          amount: "1200",
          payerMemberId: "amy",
          status: ExpenseStatus.active,
          participants: [
            { memberId: "amy", shareAmount: "600" },
            { memberId: "tom", shareAmount: "600" }
          ]
        }
      ],
      "JPY"
    );

    expect(result.members).toEqual([
      {
        memberId: "amy",
        displayName: "Amy",
        paidAmount: "1200",
        shareAmount: "1600",
        balance: "-400"
      },
      {
        memberId: "tom",
        displayName: "Tom",
        paidAmount: "0",
        shareAmount: "1600",
        balance: "-1600"
      },
      {
        memberId: "wei",
        displayName: "Wei",
        paidAmount: "3000",
        shareAmount: "1000",
        balance: "2000"
      }
    ]);
    expect(result.settlements).toEqual([
      { fromMemberId: "amy", toMemberId: "wei", amount: "400" },
      { fromMemberId: "tom", toMemberId: "wei", amount: "1600" }
    ]);
  });

  it("ignores voided expenses", () => {
    const result = calculateBalances(
      members,
      [
        {
          amount: "999",
          payerMemberId: "wei",
          status: ExpenseStatus.voided,
          participants: [{ memberId: "amy", shareAmount: "999" }]
        }
      ],
      "JPY"
    );

    expect(result.members.every((member) => member.balance === "0")).toBe(true);
    expect(result.settlements).toEqual([]);
  });
});
