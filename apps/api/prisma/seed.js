const {
  AIProposalStatus,
  AIProposalType,
  BookingType,
  EventCategory,
  ExpenseCategory,
  PrismaClient,
  TripRole
} = require("@prisma/client");

const prisma = new PrismaClient();

const ids = {
  user: "00000000-0000-4000-8000-000000000001",
  trip: "10000000-0000-4000-8000-000000000001",
  owner: "20000000-0000-4000-8000-000000000001",
  amy: "20000000-0000-4000-8000-000000000002",
  tom: "20000000-0000-4000-8000-000000000003",
  day1: "30000000-0000-4000-8000-000000000001",
  day2: "30000000-0000-4000-8000-000000000002",
  day3: "30000000-0000-4000-8000-000000000003",
  day4: "30000000-0000-4000-8000-000000000004",
  day5: "30000000-0000-4000-8000-000000000005",
  event1: "40000000-0000-4000-8000-000000000001",
  event2: "40000000-0000-4000-8000-000000000002",
  expense: "50000000-0000-4000-8000-000000000001",
  booking: "60000000-0000-4000-8000-000000000001",
  proposal: "70000000-0000-4000-8000-000000000001"
};

async function main() {
  await prisma.user.upsert({
    where: { id: ids.user },
    update: { displayName: "Demo Traveler" },
    create: {
      id: ids.user,
      email: "demo@voyage.local",
      displayName: "Demo Traveler"
    }
  });

  await prisma.trip.upsert({
    where: { id: ids.trip },
    update: {},
    create: {
      id: ids.trip,
      name: "Tokyo Autumn Escape",
      destinationCountry: "Japan",
      destinationCity: "Tokyo",
      startDate: new Date("2026-09-15T00:00:00.000Z"),
      endDate: new Date("2026-09-19T00:00:00.000Z"),
      baseCurrency: "JPY",
      budgetAmount: "120000",
      ownerUserId: ids.user
    }
  });

  const members = [
    {
      id: ids.owner,
      userId: ids.user,
      displayName: "Demo Traveler",
      role: TripRole.owner,
      joinedAt: new Date()
    },
    { id: ids.amy, displayName: "Amy", role: TripRole.member },
    { id: ids.tom, displayName: "Tom", role: TripRole.member }
  ];
  for (const member of members) {
    await prisma.tripMember.upsert({
      where: { id: member.id },
      update: { displayName: member.displayName },
      create: { ...member, tripId: ids.trip }
    });
  }

  const days = [
    [ids.day1, "2026-09-15", 1, "Arrival"],
    [ids.day2, "2026-09-16", 2, "Old Tokyo"],
    [ids.day3, "2026-09-17", 3, "Art and neighborhoods"],
    [ids.day4, "2026-09-18", 4, "Open day"],
    [ids.day5, "2026-09-19", 5, "Departure"]
  ];
  for (const [id, date, dayIndex, title] of days) {
    await prisma.itineraryDay.upsert({
      where: { id },
      update: { title },
      create: {
        id,
        tripId: ids.trip,
        date: new Date(`${date}T00:00:00.000Z`),
        dayIndex,
        title
      }
    });
  }

  await prisma.itineraryEvent.upsert({
    where: { id: ids.event1 },
    update: {},
    create: {
      id: ids.event1,
      tripId: ids.trip,
      dayId: ids.day2,
      title: "Senso-ji morning walk",
      category: EventCategory.attraction,
      startTime: new Date("2026-09-16T00:00:00.000Z"),
      endTime: new Date("2026-09-16T02:00:00.000Z"),
      locationName: "Senso-ji",
      address: "Asakusa, Tokyo",
      notes: "Meet by Kaminarimon Gate.",
      sortOrder: 0,
      createdByMemberId: ids.owner,
      participants: {
        create: [ids.owner, ids.amy, ids.tom].map((memberId) => ({ memberId }))
      }
    }
  });

  await prisma.itineraryEvent.upsert({
    where: { id: ids.event2 },
    update: {},
    create: {
      id: ids.event2,
      tripId: ids.trip,
      dayId: ids.day2,
      title: "Lunch near Kuramae",
      category: EventCategory.restaurant,
      startTime: new Date("2026-09-16T03:00:00.000Z"),
      endTime: new Date("2026-09-16T04:00:00.000Z"),
      locationName: "Kuramae",
      sortOrder: 1,
      createdByMemberId: ids.owner
    }
  });

  await prisma.expense.upsert({
    where: { id: ids.expense },
    update: {},
    create: {
      id: ids.expense,
      tripId: ids.trip,
      title: "Hotel deposit",
      merchant: "Kanda Stay",
      amount: "30000",
      currency: "JPY",
      category: ExpenseCategory.hotel,
      expenseDate: new Date("2026-09-15T00:00:00.000Z"),
      payerMemberId: ids.owner,
      createdByMemberId: ids.owner,
      participants: {
        create: [ids.owner, ids.amy, ids.tom].map((memberId) => ({
          memberId,
          shareAmount: "10000"
        }))
      }
    }
  });

  await prisma.booking.upsert({
    where: { id: ids.booking },
    update: {},
    create: {
      id: ids.booking,
      tripId: ids.trip,
      type: BookingType.hotel,
      title: "Kanda Stay",
      provider: "Voyage Hotels",
      confirmationCode: "TOKYO26",
      startTime: new Date("2026-09-15T06:00:00.000Z"),
      endTime: new Date("2026-09-19T02:00:00.000Z"),
      location: "Kanda, Tokyo",
      createdByMemberId: ids.owner
    }
  });

  await prisma.aIProposal.upsert({
    where: { id: ids.proposal },
    update: {},
    create: {
      id: ids.proposal,
      tripId: ids.trip,
      type: AIProposalType.itinerary_check,
      inputText: "Check whether day 2 feels rushed.",
      summary: "Day 2 has enough breathing room between Asakusa and lunch.",
      proposedJson: {
        kind: "itinerary_check",
        warnings: [],
        operations: []
      },
      status: AIProposalStatus.pending,
      createdByMemberId: ids.owner
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
