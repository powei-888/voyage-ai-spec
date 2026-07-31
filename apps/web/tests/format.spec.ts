import { formatDate, formatMoney, titleCase, toDateTimeInput } from "../src/lib/format";

describe("web format helpers", () => {
  it("formats zero-decimal and decimal currencies", () => {
    expect(formatMoney("1001", "JPY")).toBe("¥1,001");
    expect(formatMoney("12.5", "USD")).toBe("$12.50");
  });

  it("formats date-only values in UTC", () => {
    expect(formatDate("2026-10-03T00:00:00.000Z")).toBe("Oct 3, 2026");
  });

  it("formats enum labels and datetime-local values", () => {
    expect(titleCase("car_rental")).toBe("Car Rental");
    expect(toDateTimeInput("2026-10-03T09:30:00.000Z")).toBe("2026-10-03T09:30");
  });
});
