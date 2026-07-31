import { ExpenseStatus, TripMemberKind } from "@prisma/client";
import { calculateBalances } from "./balance-calculator";

describe("calculateBalances", () => {
  const members = [
    { id: "amy", displayName: "Amy", kind: TripMemberKind.traveler },
    { id: "tom", displayName: "Tom", kind: TripMemberKind.traveler },
    { id: "wei", displayName: "Wei", kind: TripMemberKind.traveler }
  ];

  const expenses = [
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
  ];

  it("aggregates multiple expenses and produces settlements", () => {
    const result = calculateBalances(members, expenses, "JPY");

    expect(result.members).toEqual([
      {
        memberId: "amy",
        displayName: "Amy",
        kind: TripMemberKind.traveler,
        paidAmount: "1200",
        shareAmount: "1600",
        balance: "-400"
      },
      {
        memberId: "tom",
        displayName: "Tom",
        kind: TripMemberKind.traveler,
        paidAmount: "0",
        shareAmount: "1600",
        balance: "-1600"
      },
      {
        memberId: "wei",
        displayName: "Wei",
        kind: TripMemberKind.traveler,
        paidAmount: "3000",
        shareAmount: "1000",
        balance: "2000"
      }
    ]);
    expect(result.settlements).toEqual([
      { fromMemberId: "amy", toMemberId: "wei", amount: "400" },
      { fromMemberId: "tom", toMemberId: "wei", amount: "1600" }
    ]);
    expect(result.externalReceivables).toEqual([]);
  });

  it("subtracts completed repayments from the remaining balances", () => {
    const result = calculateBalances(members, expenses, "JPY", [
      { fromMemberId: "amy", toMemberId: "wei", amount: "400" }
    ]);

    expect(result.members.find((member) => member.memberId === "amy")?.balance).toBe("0");
    expect(result.members.find((member) => member.memberId === "wei")?.balance).toBe("1600");
    expect(result.settlements).toEqual([
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

  it("tracks an external proxy purchase as a receivable and repayment", () => {
    const result = calculateBalances(
      [
        {
          id: "buyer",
          displayName: "Buyer",
          kind: TripMemberKind.traveler
        },
        {
          id: "customer",
          displayName: "External customer",
          kind: TripMemberKind.external
        }
      ],
      [
        {
          amount: "500",
          payerMemberId: "buyer",
          status: ExpenseStatus.active,
          participants: [{ memberId: "customer", shareAmount: "500" }]
        }
      ],
      "TWD"
    );

    expect(result.externalReceivables).toEqual([
      {
        memberId: "customer",
        displayName: "External customer",
        amount: "500.00"
      }
    ]);
    expect(result.settlements).toEqual([
      { fromMemberId: "customer", toMemberId: "buyer", amount: "500.00" }
    ]);
  });
});
