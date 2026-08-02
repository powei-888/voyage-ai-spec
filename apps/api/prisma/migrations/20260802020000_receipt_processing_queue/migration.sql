ALTER TABLE "Receipt"
ADD COLUMN "ocrAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ocrMaxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "ocrNextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "ocrStartedAt" TIMESTAMP(3),
ADD COLUMN "ocrCompletedAt" TIMESTAMP(3),
ADD COLUMN "ocrLeaseExpiresAt" TIMESTAMP(3),
ADD COLUMN "ocrLastError" TEXT;

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_ocr_attempt_count_check"
CHECK ("ocrAttemptCount" >= 0 AND "ocrMaxAttempts" BETWEEN 1 AND 10);

CREATE INDEX "Receipt_ocrStatus_ocrNextAttemptAt_idx"
ON "Receipt"("ocrStatus", "ocrNextAttemptAt");

CREATE INDEX "Receipt_ocrLeaseExpiresAt_idx"
ON "Receipt"("ocrLeaseExpiresAt");
