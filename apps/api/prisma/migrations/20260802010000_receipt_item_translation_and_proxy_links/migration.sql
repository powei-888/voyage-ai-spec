DROP INDEX "ProxyPurchase_expenseId_key";

ALTER TABLE "ProxyPurchase"
ADD COLUMN "sourceReceiptId" TEXT;

ALTER TABLE "ProxyPurchaseItem"
ADD COLUMN "sourceReceiptId" TEXT,
ADD COLUMN "sourceReceiptItemIndex" INTEGER,
ADD CONSTRAINT "ProxyPurchaseItem_source_fields_check" CHECK (
  ("sourceReceiptId" IS NULL AND "sourceReceiptItemIndex" IS NULL)
  OR ("sourceReceiptId" IS NOT NULL AND "sourceReceiptItemIndex" IS NOT NULL AND "sourceReceiptItemIndex" >= 0)
);

CREATE INDEX "ProxyPurchase_sourceReceiptId_idx" ON "ProxyPurchase"("sourceReceiptId");
CREATE INDEX "ProxyPurchaseItem_sourceReceiptId_idx" ON "ProxyPurchaseItem"("sourceReceiptId");
CREATE UNIQUE INDEX "ProxyPurchaseItem_sourceReceiptId_sourceReceiptItemIndex_key"
ON "ProxyPurchaseItem"("sourceReceiptId", "sourceReceiptItemIndex");

ALTER TABLE "ProxyPurchase"
ADD CONSTRAINT "ProxyPurchase_sourceReceiptId_fkey"
FOREIGN KEY ("sourceReceiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProxyPurchaseItem"
ADD CONSTRAINT "ProxyPurchaseItem_sourceReceiptId_fkey"
FOREIGN KEY ("sourceReceiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
