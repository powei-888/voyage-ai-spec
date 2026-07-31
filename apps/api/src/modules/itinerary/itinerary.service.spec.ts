import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { ItineraryService } from "./itinerary.service";

describe("ItineraryService.moveEvent", () => {
  it("moves an event across days and normalizes both day orders", async () => {
    const event = {
      id: "event-move",
      tripId: "trip-1",
      dayId: "day-1",
      day: { date: new Date("2026-09-15T00:00:00.000Z") },
      startTime: new Date("2026-09-15T02:00:00.000Z"),
      endTime: new Date("2026-09-15T03:00:00.000Z")
    };
    const update = jest.fn().mockResolvedValue(event);
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: "target-a" }])
      .mockResolvedValueOnce([{ id: "source-a" }]);
    const itineraryEvent = {
      findFirst: jest.fn().mockResolvedValue(event),
      findMany,
      update
    };
    const transactionClient = { itineraryEvent };
    const prisma = {
      itineraryEvent,
      itineraryDay: {
        findFirst: jest.fn().mockResolvedValue({
          id: "day-2",
          tripId: "trip-1",
          date: new Date("2026-09-16T00:00:00.000Z")
        })
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback(transactionClient)
      )
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "member-1" })
    };
    const service = new ItineraryService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService
    );

    await service.moveEvent("user-1", "trip-1", "event-move", {
      targetDayId: "day-2",
      targetIndex: 1
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "event-move" },
      data: {
        dayId: "day-2",
        startTime: new Date("2026-09-16T02:00:00.000Z"),
        endTime: new Date("2026-09-16T03:00:00.000Z")
      }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "source-a" },
      data: { sortOrder: 0 }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "target-a" },
      data: { sortOrder: 0 }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "event-move" },
      data: { sortOrder: 1 }
    });
  });

  it("rejects an out-of-range target position", async () => {
    const prisma = {
      itineraryEvent: {
        findFirst: jest.fn().mockResolvedValue({
          id: "event-move",
          tripId: "trip-1",
          dayId: "day-1",
          day: { date: new Date("2026-09-15T00:00:00.000Z") },
          startTime: null,
          endTime: null
        }),
        findMany: jest.fn().mockResolvedValue([])
      },
      itineraryDay: {
        findFirst: jest.fn().mockResolvedValue({
          id: "day-2",
          tripId: "trip-1",
          date: new Date("2026-09-16T00:00:00.000Z")
        })
      }
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "member-1" })
    };
    const service = new ItineraryService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService
    );

    await expect(
      service.moveEvent("user-1", "trip-1", "event-move", {
        targetDayId: "day-2",
        targetIndex: 2
      })
    ).rejects.toThrow("Target position is out of range.");
  });
});
