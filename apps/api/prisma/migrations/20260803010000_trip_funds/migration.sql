CREATE TYPE "ExpensePaymentSource" AS ENUM ('member', 'fund');
CREATE TYPE "FundTransactionType" AS ENUM (
    'contribution',
    'refund',
    'adjustment_credit',
    'adjustment_debit',
    'collection'
);

CREATE TABLE "TripFund" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripFund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TripFund_currency_check" CHECK (char_length("currency") = 3)
);

CREATE TABLE "FundTransaction" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" "FundTransactionType" NOT NULL,
    "memberId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "proxyPurchaseId" TEXT,
    "createdByMemberId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByMemberId" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FundTransaction_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "FundTransaction_party_check" CHECK (
      ("type" IN ('contribution', 'refund') AND "memberId" IS NOT NULL AND "proxyPurchaseId" IS NULL)
      OR ("type" = 'collection' AND "memberId" IS NOT NULL)
      OR ("type" IN ('adjustment_credit', 'adjustment_debit') AND "memberId" IS NULL AND "proxyPurchaseId" IS NULL)
    ),
    CONSTRAINT "FundTransaction_void_check" CHECK (
      ("voidedAt" IS NULL AND "voidedByMemberId" IS NULL AND "voidReason" IS NULL)
      OR ("voidedAt" IS NOT NULL AND "voidedByMemberId" IS NOT NULL AND "voidReason" IS NOT NULL)
    )
);

ALTER TABLE "Expense"
  ADD COLUMN "paymentSource" "ExpensePaymentSource" NOT NULL DEFAULT 'member',
  ADD COLUMN "fundId" TEXT,
  ALTER COLUMN "payerMemberId" DROP NOT NULL;

ALTER TABLE "ProxyPurchase"
  ADD COLUMN "paymentSource" "ExpensePaymentSource" NOT NULL DEFAULT 'member',
  ADD COLUMN "fundId" TEXT;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payment_source_check" CHECK (
  ("paymentSource" = 'member' AND "payerMemberId" IS NOT NULL AND "fundId" IS NULL)
  OR ("paymentSource" = 'fund' AND "payerMemberId" IS NULL AND "fundId" IS NOT NULL)
);

ALTER TABLE "ProxyPurchase" DROP CONSTRAINT "ProxyPurchase_status_fields_check";
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_payment_source_check" CHECK (
  ("paymentSource" = 'member' AND "fundId" IS NULL)
  OR ("paymentSource" = 'fund' AND "payerMemberId" IS NULL AND "fundId" IS NOT NULL)
);
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_status_fields_check" CHECK (
  ("status" = 'requested' AND "payerMemberId" IS NULL AND "fundId" IS NULL AND "expenseId" IS NULL AND "purchasedAt" IS NULL)
  OR (
    "status" = 'purchased'
    AND "expenseId" IS NOT NULL
    AND "purchasedAt" IS NOT NULL
    AND (
      ("paymentSource" = 'member' AND "payerMemberId" IS NOT NULL AND "fundId" IS NULL)
      OR ("paymentSource" = 'fund' AND "payerMemberId" IS NULL AND "fundId" IS NOT NULL)
    )
  )
  OR "status" = 'cancelled'
);

CREATE UNIQUE INDEX "TripFund_tripId_currency_key" ON "TripFund"("tripId", "currency");
CREATE INDEX "TripFund_tripId_idx" ON "TripFund"("tripId");
CREATE INDEX "Expense_fundId_idx" ON "Expense"("fundId");
CREATE INDEX "ProxyPurchase_fundId_idx" ON "ProxyPurchase"("fundId");
CREATE INDEX "FundTransaction_fundId_transactionDate_idx" ON "FundTransaction"("fundId", "transactionDate");
CREATE INDEX "FundTransaction_memberId_idx" ON "FundTransaction"("memberId");
CREATE INDEX "FundTransaction_proxyPurchaseId_idx" ON "FundTransaction"("proxyPurchaseId");
CREATE INDEX "FundTransaction_createdByMemberId_idx" ON "FundTransaction"("createdByMemberId");
CREATE INDEX "FundTransaction_voidedByMemberId_idx" ON "FundTransaction"("voidedByMemberId");

ALTER TABLE "TripFund" ADD CONSTRAINT "TripFund_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "TripFund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "TripFund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "TripFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TripMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_proxyPurchaseId_fkey" FOREIGN KEY ("proxyPurchaseId") REFERENCES "ProxyPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_voidedByMemberId_fkey" FOREIGN KEY ("voidedByMemberId") REFERENCES "TripMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
