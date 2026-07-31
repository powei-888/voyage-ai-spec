-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "TripRole" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('attraction', 'restaurant', 'hotel', 'transport', 'activity', 'shopping', 'free_time', 'other');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('food', 'hotel', 'transport', 'shopping', 'ticket', 'activity', 'other');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('active', 'voided');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('pending', 'processing', 'extracted', 'confirmed', 'failed');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('flight', 'hotel', 'train', 'bus', 'restaurant', 'activity', 'car_rental', 'other');

-- CreateEnum
CREATE TYPE "AIProposalType" AS ENUM ('itinerary_check', 'itinerary_update', 'expense_summary', 'receipt_review', 'booking_parse', 'memory_draft');

-- CreateEnum
CREATE TYPE "AIProposalStatus" AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destinationCountry" TEXT,
    "destinationCity" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "budgetAmount" DECIMAL(65,30),
    "ownerUserId" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripMember" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "TripRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL DEFAULT 'other',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "locationName" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "notes" TEXT,
    "estimatedCostAmount" DECIMAL(65,30),
    "estimatedCostCurrency" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "uploadedByMemberId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageOriginalName" TEXT,
    "imageMimeType" TEXT,
    "ocrStatus" "ReceiptStatus" NOT NULL DEFAULT 'pending',
    "extractedJson" JSONB,
    "confidenceScore" DECIMAL(65,30),
    "confirmedByMemberId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "merchant" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'other',
    "expenseDate" TIMESTAMP(3),
    "payerMemberId" TEXT NOT NULL,
    "linkedReceiptId" TEXT,
    "linkedEventId" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'active',
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseParticipant" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "shareAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "confirmationCode" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "location" TEXT,
    "attachmentUrl" TEXT,
    "linkedEventId" TEXT,
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProposal" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" "AIProposalType" NOT NULL,
    "inputText" TEXT,
    "summary" TEXT NOT NULL,
    "proposedJson" JSONB NOT NULL,
    "status" "AIProposalStatus" NOT NULL DEFAULT 'pending',
    "createdByMemberId" TEXT,
    "appliedByMemberId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Trip_ownerUserId_idx" ON "Trip"("ownerUserId");

-- CreateIndex
CREATE INDEX "Trip_startDate_idx" ON "Trip"("startDate");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "TripMember_tripId_idx" ON "TripMember"("tripId");

-- CreateIndex
CREATE INDEX "TripMember_userId_idx" ON "TripMember"("userId");

-- CreateIndex
CREATE INDEX "TripMember_tripId_displayName_idx" ON "TripMember"("tripId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "TripMember_tripId_userId_key" ON "TripMember"("tripId", "userId");

-- CreateIndex
CREATE INDEX "ItineraryDay_tripId_idx" ON "ItineraryDay"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_tripId_date_key" ON "ItineraryDay"("tripId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_tripId_dayIndex_key" ON "ItineraryDay"("tripId", "dayIndex");

-- CreateIndex
CREATE INDEX "ItineraryEvent_tripId_idx" ON "ItineraryEvent"("tripId");

-- CreateIndex
CREATE INDEX "ItineraryEvent_dayId_idx" ON "ItineraryEvent"("dayId");

-- CreateIndex
CREATE INDEX "ItineraryEvent_dayId_sortOrder_idx" ON "ItineraryEvent"("dayId", "sortOrder");

-- CreateIndex
CREATE INDEX "ItineraryEvent_category_idx" ON "ItineraryEvent"("category");

-- CreateIndex
CREATE INDEX "EventParticipant_memberId_idx" ON "EventParticipant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_memberId_key" ON "EventParticipant"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "Receipt_tripId_idx" ON "Receipt"("tripId");

-- CreateIndex
CREATE INDEX "Receipt_ocrStatus_idx" ON "Receipt"("ocrStatus");

-- CreateIndex
CREATE INDEX "Receipt_uploadedByMemberId_idx" ON "Receipt"("uploadedByMemberId");

-- CreateIndex
CREATE INDEX "Receipt_confirmedByMemberId_idx" ON "Receipt"("confirmedByMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_linkedReceiptId_key" ON "Expense"("linkedReceiptId");

-- CreateIndex
CREATE INDEX "Expense_tripId_idx" ON "Expense"("tripId");

-- CreateIndex
CREATE INDEX "Expense_payerMemberId_idx" ON "Expense"("payerMemberId");

-- CreateIndex
CREATE INDEX "Expense_linkedEventId_idx" ON "Expense"("linkedEventId");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_createdByMemberId_idx" ON "Expense"("createdByMemberId");

-- CreateIndex
CREATE INDEX "ExpenseParticipant_memberId_idx" ON "ExpenseParticipant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseParticipant_expenseId_memberId_key" ON "ExpenseParticipant"("expenseId", "memberId");

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- CreateIndex
CREATE INDEX "Booking_type_idx" ON "Booking"("type");

-- CreateIndex
CREATE INDEX "Booking_linkedEventId_idx" ON "Booking"("linkedEventId");

-- CreateIndex
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");

-- CreateIndex
CREATE INDEX "Booking_createdByMemberId_idx" ON "Booking"("createdByMemberId");

-- CreateIndex
CREATE INDEX "AIProposal_tripId_idx" ON "AIProposal"("tripId");

-- CreateIndex
CREATE INDEX "AIProposal_type_idx" ON "AIProposal"("type");

-- CreateIndex
CREATE INDEX "AIProposal_status_idx" ON "AIProposal"("status");

-- CreateIndex
CREATE INDEX "AIProposal_createdByMemberId_idx" ON "AIProposal"("createdByMemberId");

-- CreateIndex
CREATE INDEX "AIProposal_appliedByMemberId_idx" ON "AIProposal"("appliedByMemberId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMember" ADD CONSTRAINT "TripMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMember" ADD CONSTRAINT "TripMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryEvent" ADD CONSTRAINT "ItineraryEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryEvent" ADD CONSTRAINT "ItineraryEvent_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryEvent" ADD CONSTRAINT "ItineraryEvent_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ItineraryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TripMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_uploadedByMemberId_fkey" FOREIGN KEY ("uploadedByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_confirmedByMemberId_fkey" FOREIGN KEY ("confirmedByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "TripMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_linkedReceiptId_fkey" FOREIGN KEY ("linkedReceiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "ItineraryEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseParticipant" ADD CONSTRAINT "ExpenseParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TripMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "ItineraryEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProposal" ADD CONSTRAINT "AIProposal_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProposal" ADD CONSTRAINT "AIProposal_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProposal" ADD CONSTRAINT "AIProposal_appliedByMemberId_fkey" FOREIGN KEY ("appliedByMemberId") REFERENCES "TripMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
