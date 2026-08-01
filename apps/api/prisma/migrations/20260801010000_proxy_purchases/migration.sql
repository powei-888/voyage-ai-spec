CREATE TYPE "ProxyPurchaseStatus" AS ENUM ('requested', 'purchased', 'cancelled');

CREATE TABLE "ProxyPurchase" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalMemberId" TEXT NOT NULL,
    "payerMemberId" TEXT,
    "expenseId" TEXT,
    "status" "ProxyPurchaseStatus" NOT NULL DEFAULT 'requested',
    "currency" TEXT NOT NULL,
    "note" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyPurchase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProxyPurchase_status_fields_check" CHECK (
      ("status" = 'requested' AND "payerMemberId" IS NULL AND "expenseId" IS NULL AND "purchasedAt" IS NULL)
      OR ("status" = 'purchased' AND "payerMemberId" IS NOT NULL AND "expenseId" IS NOT NULL AND "purchasedAt" IS NOT NULL)
      OR "status" = 'cancelled'
    ),
    CONSTRAINT "ProxyPurchase_currency_check" CHECK (char_length("currency") = 3)
);

CREATE TABLE "ProxyPurchaseItem" (
    "id" TEXT NOT NULL,
    "proxyPurchaseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyPurchaseItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProxyPurchaseItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "ProxyPurchaseItem_unit_price_check" CHECK ("unitPrice" > 0),
    CONSTRAINT "ProxyPurchaseItem_amount_check" CHECK ("amount" > 0)
);

ALTER TABLE "Settlement" ADD COLUMN "proxyPurchaseId" TEXT;

CREATE UNIQUE INDEX "ProxyPurchase_expenseId_key" ON "ProxyPurchase"("expenseId");
CREATE INDEX "ProxyPurchase_tripId_status_idx" ON "ProxyPurchase"("tripId", "status");
CREATE INDEX "ProxyPurchase_externalMemberId_idx" ON "ProxyPurchase"("externalMemberId");
CREATE INDEX "ProxyPurchase_payerMemberId_idx" ON "ProxyPurchase"("payerMemberId");
CREATE INDEX "ProxyPurchase_createdByMemberId_idx" ON "ProxyPurchase"("createdByMemberId");
CREATE INDEX "ProxyPurchaseItem_proxyPurchaseId_sortOrder_idx" ON "ProxyPurchaseItem"("proxyPurchaseId", "sortOrder");
CREATE INDEX "Settlement_proxyPurchaseId_idx" ON "Settlement"("proxyPurchaseId");

ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_externalMemberId_fkey" FOREIGN KEY ("externalMemberId") REFERENCES "TripMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProxyPurchase" ADD CONSTRAINT "ProxyPurchase_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProxyPurchaseItem" ADD CONSTRAINT "ProxyPurchaseItem_proxyPurchaseId_fkey" FOREIGN KEY ("proxyPurchaseId") REFERENCES "ProxyPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_proxyPurchaseId_fkey" FOREIGN KEY ("proxyPurchaseId") REFERENCES "ProxyPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
