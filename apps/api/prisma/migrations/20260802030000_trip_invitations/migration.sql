CREATE TYPE "TripInviteMode" AS ENUM ('single', 'group');

CREATE TABLE "TripInvite" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "mode" "TripInviteMode" NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripInvite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TripInvite_usage_check" CHECK (
      "maxUses" BETWEEN 1 AND 100
      AND "useCount" >= 0
      AND "useCount" <= "maxUses"
      AND (("mode" = 'single' AND "maxUses" = 1) OR "mode" = 'group')
    )
);

CREATE TABLE "TripInviteRedemption" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripInviteRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TripInvite_tokenHash_key" ON "TripInvite"("tokenHash");
CREATE INDEX "TripInvite_tripId_createdAt_idx" ON "TripInvite"("tripId", "createdAt");
CREATE INDEX "TripInvite_expiresAt_idx" ON "TripInvite"("expiresAt");
CREATE INDEX "TripInvite_createdByMemberId_idx" ON "TripInvite"("createdByMemberId");
CREATE UNIQUE INDEX "TripInviteRedemption_inviteId_userId_key" ON "TripInviteRedemption"("inviteId", "userId");
CREATE INDEX "TripInviteRedemption_userId_idx" ON "TripInviteRedemption"("userId");
CREATE INDEX "TripInviteRedemption_memberId_idx" ON "TripInviteRedemption"("memberId");

ALTER TABLE "TripInvite" ADD CONSTRAINT "TripInvite_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripInvite" ADD CONSTRAINT "TripInvite_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripInviteRedemption" ADD CONSTRAINT "TripInviteRedemption_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "TripInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripInviteRedemption" ADD CONSTRAINT "TripInviteRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripInviteRedemption" ADD CONSTRAINT "TripInviteRedemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
