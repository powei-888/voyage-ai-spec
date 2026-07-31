-- CreateEnum
CREATE TYPE "TripMemberKind" AS ENUM ('traveler', 'external');

-- AlterTable
ALTER TABLE "TripMember"
ADD COLUMN "kind" "TripMemberKind" NOT NULL DEFAULT 'traveler';

-- External parties are ledger-only identities and never receive trip access.
ALTER TABLE "TripMember"
ADD CONSTRAINT "TripMember_external_ledger_only_check"
CHECK (
  "kind" = 'traveler'
  OR ("userId" IS NULL AND "role" = 'member')
);

-- CreateIndex
CREATE INDEX "TripMember_tripId_kind_idx" ON "TripMember"("tripId", "kind");
