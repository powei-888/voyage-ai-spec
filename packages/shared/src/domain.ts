export type LocalUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export type AuthSession = {
  token: string;
  expiresAt: string;
  user: LocalUser;
};

export type AuthRegistrationSession = AuthSession & {
  joinedTripId: string | null;
};

export type TripInviteStatus = "active" | "expired" | "revoked" | "full" | "archived";

export type TripInviteRedemption = {
  id: string;
  redeemedAt: string;
  user: Pick<LocalUser, "id" | "email" | "displayName">;
};

export type TripInvite = {
  id: string;
  tripId: string;
  mode: "single" | "group";
  maxUses: number;
  useCount: number;
  remainingUses: number;
  status: TripInviteStatus;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  createdByMember: { id: string; displayName: string };
  redemptions: TripInviteRedemption[];
};

export type TripInviteCreateResult = {
  invite: TripInvite;
  token: string;
};

export type TripInvitePreview = {
  status: TripInviteStatus;
  mode: "single" | "group";
  maxUses: number;
  useCount: number;
  remainingUses: number;
  expiresAt: string;
  trip: {
    name: string;
    destinationCountry: string | null;
    destinationCity: string | null;
    startDate: string;
    endDate: string;
  };
  invitedBy: { displayName: string };
};

export type TripInviteAcceptResult = {
  tripId: string;
  memberId: string;
  alreadyMember: boolean;
};

export type RecordCounts = {
  members: number;
  events: number;
  expenses: number;
  receipts: number;
  bookings: number;
  proposals: number;
};

export type Trip = {
  id: string;
  name: string;
  destinationCountry: string | null;
  destinationCity: string | null;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  budgetAmount: string | null;
  status: "active" | "archived";
  ownerUserId: string;
  owner?: { id: string; displayName: string; email: string };
  _count: RecordCounts;
  events?: Array<{ id: string; title: string; startTime: string | null }>;
};

export type TripMember = {
  id: string;
  tripId: string;
  userId: string | null;
  displayName: string;
  role: "owner" | "member";
  kind: "traveler" | "external";
  joinedAt: string | null;
  user?: { id: string; email: string; avatarUrl: string | null } | null;
};

export type EventParticipant = {
  memberId: string;
  member: { id: string; displayName: string };
};

export type ItineraryEvent = {
  id: string;
  tripId: string;
  dayId: string;
  title: string;
  category: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  address: string | null;
  notes: string | null;
  estimatedCostAmount: string | null;
  estimatedCostCurrency: string | null;
  sortOrder: number;
  participants: EventParticipant[];
  _count: { bookings: number; expenses: number };
};

export type ItineraryDay = {
  id: string;
  tripId: string;
  date: string;
  dayIndex: number;
  title: string | null;
  notes: string | null;
  events: ItineraryEvent[];
};

export type ExpenseParticipant = {
  memberId: string;
  shareAmount: string;
  member: { id: string; displayName: string };
};

export type Expense = {
  id: string;
  tripId: string;
  title: string;
  merchant: string | null;
  amount: string;
  currency: string;
  category: string;
  expenseDate: string | null;
  payerMemberId: string;
  linkedReceiptId: string | null;
  linkedEventId: string | null;
  status: "active" | "voided";
  splitMethod: "equal" | "custom";
  payerMember: { id: string; displayName: string };
  participants: ExpenseParticipant[];
  linkedEvent: { id: string; title: string } | null;
  proxyPurchases: Array<{ id: string }>;
};

export type ExpenseBalances = {
  currency: string;
  members: Array<{
    memberId: string;
    displayName: string;
    kind: "traveler" | "external";
    paidAmount: string;
    shareAmount: string;
    balance: string;
  }>;
  settlements: Array<{
    fromMemberId: string;
    toMemberId: string;
    amount: string;
  }>;
  externalReceivables: Array<{
    memberId: string;
    displayName: string;
    amount: string;
  }>;
};

export type ReceiptLineItem = {
  description: string;
  translatedDescription: string | null;
  originalLanguage: string | null;
  translationStatus: "pending" | "translated" | "failed";
  translationSource: "local_ai" | "manual" | null;
  translationModel: string | null;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
};

export type Settlement = {
  id: string;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: string;
  currency: string;
  note: string | null;
  settledAt: string;
  createdAt: string;
  proxyPurchaseId: string | null;
  fromMember: { id: string; displayName: string };
  toMember: { id: string; displayName: string };
  createdByMember: { id: string; displayName: string } | null;
};

export type ProxyPurchaseItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  note: string | null;
  sortOrder: number;
  sourceReceiptId: string | null;
  sourceReceiptItemIndex: number | null;
};

export type ProxyPurchase = {
  id: string;
  tripId: string;
  externalMemberId: string;
  payerMemberId: string | null;
  expenseId: string | null;
  sourceReceiptId: string | null;
  status: "requested" | "purchased" | "settled" | "cancelled";
  currency: string;
  note: string | null;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalAmount: string;
  collectedAmount: string;
  outstandingAmount: string;
  canCancel: boolean;
  externalMember: { id: string; displayName: string };
  payerMember: { id: string; displayName: string } | null;
  expense: { id: string; status: "active" | "voided" } | null;
  items: ProxyPurchaseItem[];
  settlements: Array<{
    id: string;
    amount: string;
    settledAt: string;
  }>;
};

export type ReceiptExtraction = {
  merchant: string;
  amount: string;
  currency: string;
  date: string;
  category: string;
  confidenceScore: number;
  items?: ReceiptLineItem[];
};

export type Receipt = {
  id: string;
  tripId: string;
  imageUrl: string;
  imageOriginalName: string | null;
  imageMimeType: string | null;
  ocrStatus: "pending" | "processing" | "extracted" | "confirmed" | "failed";
  extractedJson: ReceiptExtraction | null;
  confidenceScore: string | null;
  ocrAttemptCount: number;
  ocrMaxAttempts: number;
  ocrNextAttemptAt: string;
  ocrStartedAt: string | null;
  ocrCompletedAt: string | null;
  ocrLeaseExpiresAt: string | null;
  ocrLastError: string | null;
  confirmedAt: string | null;
  createdAt: string;
  uploadedByMember: { id: string; displayName: string } | null;
  confirmedByMember: { id: string; displayName: string } | null;
  confirmedExpense: {
    id: string;
    title: string;
    amount: string;
    currency: string;
  } | null;
  proxyPurchases: Array<{
    id: string;
    status: "requested" | "purchased" | "cancelled";
    externalMember: { id: string; displayName: string };
    items: Array<{ sourceReceiptItemIndex: number | null }>;
  }>;
};

export type Booking = {
  id: string;
  tripId: string;
  type: string;
  title: string;
  provider: string | null;
  confirmationCode: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  attachmentUrl: string | null;
  linkedEventId: string | null;
  linkedEvent: { id: string; title: string } | null;
  createdByMember: { id: string; displayName: string } | null;
};

export type AIProposal = {
  id: string;
  tripId: string;
  type: string;
  inputText: string | null;
  summary: string;
  proposedJson: Record<string, unknown>;
  status: "pending" | "accepted" | "rejected" | "expired";
  createdAt: string;
  appliedAt: string | null;
  createdByMember: { id: string; displayName: string } | null;
  appliedByMember: { id: string; displayName: string } | null;
};

export type TripDashboard = {
  trip: Trip;
  todayEvents: ItineraryEvent[];
  upcomingEvent: ItineraryEvent | null;
  recordedExpenseAmount: string;
  pendingReceipts: number;
  pendingProposals: number;
  upcomingBookings: Booking[];
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};
