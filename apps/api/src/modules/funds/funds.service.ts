import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ExpenseStatus,
  FundTransactionType,
  Prisma,
  ProxyPurchaseStatus,
  TripMemberKind
} from "@prisma/client";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { fromMinorUnits, toMinorUnits } from "../expenses/money";
import { calculateFundCash } from "./fund-calculator";
import {
  CreateFundDto,
  CreateFundTransactionDto,
  VoidFundTransactionDto
} from "./funds.dto";

const transactionInclude = {
  member: { select: { id: true, displayName: true, kind: true } },
  createdByMember: { select: { id: true, displayName: true } },
  voidedByMember: { select: { id: true, displayName: true } },
  proxyPurchase: {
    select: { id: true, externalMember: { select: { id: true, displayName: true } } }
  }
} satisfies Prisma.FundTransactionInclude;

const fundInclude = {
  transactions: {
    include: transactionInclude,
    orderBy: [{ transactionDate: "desc" as const }, { createdAt: "desc" as const }]
  },
  expenses: {
    select: {
      id: true,
      title: true,
      merchant: true,
      amount: true,
      status: true,
      expenseDate: true,
      createdAt: true,
      linkedReceiptId: true,
      proxyPurchases: { select: { id: true } }
    },
    orderBy: [{ expenseDate: "desc" as const }, { createdAt: "desc" as const }]
  }
} satisfies Prisma.TripFundInclude;

type FundRecord = Prisma.TripFundGetPayload<{ include: typeof fundInclude }>;
type TransactionRecord = Prisma.FundTransactionGetPayload<{
  include: typeof transactionInclude;
}>;

const FUND_OUTFLOW_TYPES = new Set<FundTransactionType>([
  FundTransactionType.refund,
  FundTransactionType.adjustment_debit
]);
const FUND_INFLOW_TYPES = new Set<FundTransactionType>([
  FundTransactionType.contribution,
  FundTransactionType.adjustment_credit,
  FundTransactionType.collection
]);
const FUND_MEMBER_TYPES = new Set<FundTransactionType>([
  FundTransactionType.contribution,
  FundTransactionType.refund
]);
const FUND_ADJUSTMENT_TYPES = new Set<FundTransactionType>([
  FundTransactionType.adjustment_credit,
  FundTransactionType.adjustment_debit
]);

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    const funds = await this.prisma.tripFund.findMany({
      where: { tripId },
      include: fundInclude,
      orderBy: { createdAt: "asc" }
    });
    return funds.map((fund) => this.serializeFund(fund));
  }

  async get(userId: string, tripId: string, fundId: string) {
    await this.access.requireMember(tripId, userId);
    const fund = await this.requireFund(this.prisma, tripId, fundId);
    return this.serializeFund(fund);
  }

  async create(userId: string, tripId: string, dto: CreateFundDto) {
    await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { baseCurrency: true }
    });
    if (!trip) throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    if (dto.currency !== trip.baseCurrency) {
      throw new DomainError(
        "CURRENCY_MISMATCH",
        `The public fund must use the trip base currency (${trip.baseCurrency}).`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    const fund = await this.prisma.tripFund.upsert({
      where: { tripId_currency: { tripId, currency: dto.currency } },
      create: {
        tripId,
        currency: dto.currency,
        name: dto.name?.trim() || "旅程公費"
      },
      update: {},
      include: fundInclude
    });
    return this.serializeFund(fund);
  }

  async createTransaction(
    userId: string,
    tripId: string,
    fundId: string,
    dto: CreateFundTransactionDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);

    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        await this.lockFund(tx, tripId, fundId);
        const fund = await this.requireFund(tx, tripId, fundId);
        const normalizedAmount = toMinorUnits(dto.amount, fund.currency);
        if (normalizedAmount <= 0n) {
          throw new DomainError("FUND_AMOUNT_REQUIRED", "Fund amount must be greater than zero.");
        }

        await this.validateTransactionParty(tx, tripId, fund, dto, normalizedAmount);
        if (FUND_OUTFLOW_TYPES.has(dto.type)) {
          const cash = this.cash(fund);
          if (cash.balanceMinor < normalizedAmount) {
            throw new DomainError(
              "FUND_INSUFFICIENT_BALANCE",
              "The public fund does not have enough available balance.",
              HttpStatus.UNPROCESSABLE_ENTITY,
              { available: cash.balance, requested: dto.amount }
            );
          }
        }

        return tx.fundTransaction.create({
          data: {
            fundId,
            type: dto.type,
            memberId: dto.memberId || null,
            amount: dto.amount,
            transactionDate: parseDateOnly(dto.transactionDate),
            note: dto.note?.trim() || null,
            proxyPurchaseId: dto.proxyPurchaseId || null,
            createdByMemberId: actor.id
          },
          include: transactionInclude
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.serializeTransaction(transaction);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new DomainError(
          "FUND_BALANCE_CHANGED",
          "The public fund changed while saving. Please try again.",
          HttpStatus.CONFLICT
        );
      }
      throw error;
    }
  }

  async voidTransaction(
    userId: string,
    tripId: string,
    fundId: string,
    transactionId: string,
    dto: VoidFundTransactionDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockFund(tx, tripId, fundId);
      const fund = await this.requireFund(tx, tripId, fundId);
      const transaction = fund.transactions.find((item) => item.id === transactionId);
      if (!transaction) {
        throw DomainError.notFound("FUND_TRANSACTION_NOT_FOUND", "Fund transaction not found.");
      }
      if (transaction.voidedAt) return transaction;

      if (FUND_INFLOW_TYPES.has(transaction.type)) {
        const remaining = this.cash(fund).balanceMinor
          - toMinorUnits(transaction.amount.toString(), fund.currency);
        if (remaining < 0n) {
          throw new DomainError(
            "FUND_INSUFFICIENT_BALANCE",
            "This transaction cannot be voided because its funds have already been spent.",
            HttpStatus.UNPROCESSABLE_ENTITY
          );
        }
      }

      return tx.fundTransaction.update({
        where: { id: transactionId },
        data: {
          voidedAt: new Date(),
          voidedByMemberId: actor.id,
          voidReason: dto.reason.trim()
        },
        include: transactionInclude
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.serializeTransaction(result);
  }

  async assertAvailable(
    tx: Prisma.TransactionClient,
    tripId: string,
    fundId: string,
    amount: string,
    reusableAmount = "0"
  ) {
    await this.lockFund(tx, tripId, fundId);
    const fund = await this.requireFund(tx, tripId, fundId);
    const requested = toMinorUnits(amount, fund.currency);
    const available = this.cash(fund).balanceMinor
      + (reusableAmount === "0"
        ? 0n
        : toMinorUnits(reusableAmount, fund.currency));
    if (requested > available) {
      throw new DomainError(
        "FUND_INSUFFICIENT_BALANCE",
        "The public fund does not have enough available balance.",
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          available: fromMinorUnits(available, fund.currency),
          requested: fromMinorUnits(requested, fund.currency)
        }
      );
    }
    return fund;
  }

  private async validateTransactionParty(
    tx: Prisma.TransactionClient,
    tripId: string,
    fund: FundRecord,
    dto: CreateFundTransactionDto,
    amountMinor: bigint
  ) {
    if (FUND_MEMBER_TYPES.has(dto.type)) {
      const member = await tx.tripMember.findFirst({
        where: { id: dto.memberId, tripId, kind: TripMemberKind.traveler },
        select: { id: true }
      });
      if (!member || dto.proxyPurchaseId) {
        throw new DomainError(
          "FUND_TRAVELER_REQUIRED",
          "Contributions and refunds require a traveler in this trip."
        );
      }
      return;
    }

    if (FUND_ADJUSTMENT_TYPES.has(dto.type)) {
      if (dto.memberId || dto.proxyPurchaseId) {
        throw new DomainError(
          "FUND_ADJUSTMENT_PARTY_NOT_ALLOWED",
          "Cash adjustments cannot be assigned to a member or proxy purchase."
        );
      }
      return;
    }

    const externalMember = await tx.tripMember.findFirst({
      where: { id: dto.memberId, tripId, kind: TripMemberKind.external },
      select: { id: true }
    });
    if (!externalMember) {
      throw new DomainError(
        "EXTERNAL_MEMBER_REQUIRED",
        "Public-fund collections require an external party in this trip."
      );
    }

    if (!dto.proxyPurchaseId) {
      const [shares, collections] = await Promise.all([
        tx.expenseParticipant.findMany({
          where: {
            memberId: dto.memberId,
            expense: { tripId, fundId: fund.id, status: ExpenseStatus.active }
          },
          select: { shareAmount: true }
        }),
        tx.fundTransaction.findMany({
          where: {
            fundId: fund.id,
            memberId: dto.memberId,
            type: FundTransactionType.collection,
            voidedAt: null
          },
          select: { amount: true }
        })
      ]);
      const receivable = shares.reduce(
        (sum, item) => sum + toMinorUnits(item.shareAmount.toString(), fund.currency),
        0n
      );
      const collected = collections.reduce(
        (sum, item) => sum + toMinorUnits(item.amount.toString(), fund.currency),
        0n
      );
      if (amountMinor > receivable - collected) {
        throw new DomainError(
          "PROXY_PURCHASE_COLLECTION_EXCEEDS_OUTSTANDING",
          "Collection exceeds the outstanding external amount.",
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
      return;
    }

    const purchase = await tx.proxyPurchase.findFirst({
      where: {
        id: dto.proxyPurchaseId,
        tripId,
        externalMemberId: dto.memberId,
        status: ProxyPurchaseStatus.purchased,
        paymentSource: "fund",
        fundId: fund.id,
        expense: { status: ExpenseStatus.active }
      },
      include: {
        items: { select: { amount: true } },
        settlements: { select: { amount: true } },
        fundTransactions: {
          where: { voidedAt: null, type: FundTransactionType.collection },
          select: { amount: true }
        }
      }
    });
    if (!purchase) {
      throw new DomainError(
        "INVALID_FUND_PROXY_COLLECTION",
        "The collection does not match an active public-fund proxy purchase.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    const total = purchase.items.reduce(
      (sum, item) => sum + toMinorUnits(item.amount.toString(), fund.currency),
      0n
    );
    const collected = [...purchase.settlements, ...purchase.fundTransactions].reduce(
      (sum, item) => sum + toMinorUnits(item.amount.toString(), fund.currency),
      0n
    );
    if (amountMinor > total - collected) {
      throw new DomainError(
        "PROXY_PURCHASE_COLLECTION_EXCEEDS_OUTSTANDING",
        "Collection exceeds the outstanding proxy-purchase amount.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
  }

  private async requireFund(
    client: PrismaService | Prisma.TransactionClient,
    tripId: string,
    fundId: string
  ): Promise<FundRecord> {
    const fund = await client.tripFund.findFirst({
      where: { id: fundId, tripId },
      include: fundInclude
    });
    if (!fund) throw DomainError.notFound("FUND_NOT_FOUND", "Public fund not found.");
    return fund;
  }

  private async lockFund(
    tx: Prisma.TransactionClient,
    tripId: string,
    fundId: string
  ) {
    const locked = await tx.tripFund.updateMany({
      where: { id: fundId, tripId },
      data: { updatedAt: new Date() }
    });
    if (locked.count !== 1) {
      throw DomainError.notFound("FUND_NOT_FOUND", "Public fund not found.");
    }
  }

  private cash(fund: FundRecord) {
    return calculateFundCash(
      fund.currency,
      fund.transactions.map((transaction) => ({
        type: transaction.type,
        amount: transaction.amount.toString(),
        voidedAt: transaction.voidedAt
      })),
      fund.expenses.map((expense) => ({
        amount: expense.amount.toString(),
        status: expense.status
      }))
    );
  }

  private serializeFund(fund: FundRecord) {
    const cash = this.cash(fund);
    const memberTotals = new Map<string, {
      member: { id: string; displayName: string; kind: TripMemberKind };
      contributed: bigint;
      refunded: bigint;
      collected: bigint;
    }>();
    for (const transaction of fund.transactions) {
      if (transaction.voidedAt || !transaction.member) continue;
      const current = memberTotals.get(transaction.member.id) ?? {
        member: transaction.member,
        contributed: 0n,
        refunded: 0n,
        collected: 0n
      };
      const amount = toMinorUnits(transaction.amount.toString(), fund.currency);
      if (transaction.type === FundTransactionType.contribution) current.contributed += amount;
      if (transaction.type === FundTransactionType.refund) current.refunded += amount;
      if (transaction.type === FundTransactionType.collection) current.collected += amount;
      memberTotals.set(transaction.member.id, current);
    }

    const transactionLedger = fund.transactions.map((transaction) => ({
      kind: "transaction" as const,
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(),
      direction: FUND_INFLOW_TYPES.has(transaction.type) ? "in" as const : "out" as const,
      occurredAt: transaction.transactionDate,
      note: transaction.note,
      status: transaction.voidedAt ? "voided" as const : "active" as const,
      member: transaction.member,
      createdByMember: transaction.createdByMember,
      voidedAt: transaction.voidedAt,
      voidedByMember: transaction.voidedByMember,
      voidReason: transaction.voidReason,
      proxyPurchase: transaction.proxyPurchase
    }));
    const expenseLedger = fund.expenses.map((expense) => ({
      kind: "expense" as const,
      id: expense.id,
      type: "expense" as const,
      amount: expense.amount.toString(),
      direction: "out" as const,
      occurredAt: expense.expenseDate ?? expense.createdAt,
      note: expense.merchant,
      status: expense.status,
      title: expense.title,
      linkedReceiptId: expense.linkedReceiptId,
      proxyPurchaseId: expense.proxyPurchases[0]?.id ?? null
    }));

    return {
      id: fund.id,
      tripId: fund.tripId,
      name: fund.name,
      currency: fund.currency,
      balance: cash.balance,
      totals: cash.totals,
      memberPositions: [...memberTotals.values()].map((item) => ({
        member: item.member,
        contributedAmount: fromMinorUnits(item.contributed, fund.currency),
        refundedAmount: fromMinorUnits(item.refunded, fund.currency),
        collectedAmount: fromMinorUnits(item.collected, fund.currency),
        netAmount: fromMinorUnits(
          item.contributed + item.collected - item.refunded,
          fund.currency
        )
      })),
      ledger: [...transactionLedger, ...expenseLedger].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ),
      createdAt: fund.createdAt,
      updatedAt: fund.updatedAt
    };
  }

  private serializeTransaction(transaction: TransactionRecord) {
    return { ...transaction, amount: transaction.amount.toString() };
  }
}
