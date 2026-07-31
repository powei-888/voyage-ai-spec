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
    update: { displayName: "示範旅人" },
    create: {
      id: ids.user,
      email: "demo@voyage.local",
      displayName: "示範旅人"
    }
  });

  await prisma.trip.upsert({
    where: { id: ids.trip },
    update: {
      name: "東京秋日之旅",
      destinationCountry: "日本",
      destinationCity: "東京"
    },
    create: {
      id: ids.trip,
      name: "東京秋日之旅",
      destinationCountry: "日本",
      destinationCity: "東京",
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
      displayName: "示範旅人",
      role: TripRole.owner,
      joinedAt: new Date()
    },
    { id: ids.amy, displayName: "小美", role: TripRole.member },
    { id: ids.tom, displayName: "小明", role: TripRole.member }
  ];
  for (const member of members) {
    await prisma.tripMember.upsert({
      where: { id: member.id },
      update: { displayName: member.displayName },
      create: { ...member, tripId: ids.trip }
    });
  }

  const days = [
    [ids.day1, "2026-09-15", 1, "抵達東京"],
    [ids.day2, "2026-09-16", 2, "東京老城"],
    [ids.day3, "2026-09-17", 3, "藝術與街區"],
    [ids.day4, "2026-09-18", 4, "自由活動"],
    [ids.day5, "2026-09-19", 5, "返程"]
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
    update: {
      title: "淺草寺晨間散步",
      locationName: "淺草寺",
      address: "東京淺草",
      notes: "在雷門前集合。"
    },
    create: {
      id: ids.event1,
      tripId: ids.trip,
      dayId: ids.day2,
      title: "淺草寺晨間散步",
      category: EventCategory.attraction,
      startTime: new Date("2026-09-16T00:00:00.000Z"),
      endTime: new Date("2026-09-16T02:00:00.000Z"),
      locationName: "淺草寺",
      address: "東京淺草",
      notes: "在雷門前集合。",
      sortOrder: 0,
      createdByMemberId: ids.owner,
      participants: {
        create: [ids.owner, ids.amy, ids.tom].map((memberId) => ({ memberId }))
      }
    }
  });

  await prisma.itineraryEvent.upsert({
    where: { id: ids.event2 },
    update: { title: "藏前午餐", locationName: "藏前" },
    create: {
      id: ids.event2,
      tripId: ids.trip,
      dayId: ids.day2,
      title: "藏前午餐",
      category: EventCategory.restaurant,
      startTime: new Date("2026-09-16T03:00:00.000Z"),
      endTime: new Date("2026-09-16T04:00:00.000Z"),
      locationName: "藏前",
      sortOrder: 1,
      createdByMemberId: ids.owner
    }
  });

  await prisma.expense.upsert({
    where: { id: ids.expense },
    update: { title: "飯店訂金", merchant: "神田旅宿" },
    create: {
      id: ids.expense,
      tripId: ids.trip,
      title: "飯店訂金",
      merchant: "神田旅宿",
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
    update: {
      title: "神田旅宿",
      provider: "Voyage 飯店",
      location: "東京神田"
    },
    create: {
      id: ids.booking,
      tripId: ids.trip,
      type: BookingType.hotel,
      title: "神田旅宿",
      provider: "Voyage 飯店",
      confirmationCode: "TOKYO26",
      startTime: new Date("2026-09-15T06:00:00.000Z"),
      endTime: new Date("2026-09-19T02:00:00.000Z"),
      location: "東京神田",
      createdByMemberId: ids.owner
    }
  });

  await prisma.aIProposal.upsert({
    where: { id: ids.proposal },
    update: {
      inputText: "檢查第二天的行程是否太緊湊。",
      summary: "第二天從淺草到午餐之間保留了足夠的彈性時間。"
    },
    create: {
      id: ids.proposal,
      tripId: ids.trip,
      type: AIProposalType.itinerary_check,
      inputText: "檢查第二天的行程是否太緊湊。",
      summary: "第二天從淺草到午餐之間保留了足夠的彈性時間。",
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
