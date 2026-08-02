import { formatDate, formatMoney, titleCase, toDateTimeInput } from "../src/lib/format";

describe("web format helpers", () => {
  it("依台灣格式顯示零位與兩位小數幣別", () => {
    expect(formatMoney("1001", "JPY")).toBe("¥1,001");
    expect(formatMoney("12.5", "USD")).toBe("US$12.50");
  });

  it("以台灣格式顯示 UTC 日期", () => {
    expect(formatDate("2026-10-03T00:00:00.000Z")).toBe("2026年10月3日");
  });

  it("顯示中文列舉標籤並保留 datetime-local 格式", () => {
    expect(titleCase("car_rental")).toBe("租車");
    expect(toDateTimeInput("2026-10-03T09:30:00.000Z")).toBe("2026-10-03T09:30");
  });
});
