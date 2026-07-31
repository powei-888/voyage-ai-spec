import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { ExpensesService } from "../expenses/expenses.service";
import { SettlementsService } from "./settlements.service";

describe("SettlementsService", () => {
  const dto = {
    fromMemberId: "debtor",
    toMemberId: "creditor",
    amount: "400",
    currency: "JPY",
    settledAt: "2026-09-16"
  };

  function setup(senderBalance = "-400", receiverBalance = "400") {
    const created = { id: "settlement-1", ...dto };
    const prisma = {
      trip: {
        findUnique: jest.fn().mockResolvedValue({ baseCurrency: "JPY" })
      },
      settlement: {
        create: jest.fn().mockResolvedValue(created)
      }
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "actor-member" }),
      assertMembersBelongToTrip: jest.fn().mockResolvedValue(undefined)
    };
    const expenses = {
      balances: jest.fn().mockResolvedValue({
        currency: "JPY",
        members: [
          { memberId: "debtor", balance: senderBalance },
          { memberId: "creditor", balance: receiverBalance }
        ],
        settlements: []
      })
    };
    return {
      service: new SettlementsService(
        prisma as unknown as PrismaService,
        access as unknown as TripAccessService,
        expenses as unknown as ExpensesService
      ),
      prisma
    };
  }

  it("records a repayment within the outstanding balances", async () => {
    const { service, prisma } = setup();
    await expect(service.create("user-1", "trip-1", dto)).resolves.toMatchObject({
      id: "settlement-1"
    });
    expect(prisma.settlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: "400",
          fromMemberId: "debtor",
          toMemberId: "creditor"
        })
      })
    );
  });

  it("rejects a repayment larger than the outstanding debt", async () => {
    const { service } = setup("-300", "400");
    await expect(service.create("user-1", "trip-1", dto)).rejects.toThrow(
      "Settlement amount exceeds the current outstanding balance."
    );
  });
});
