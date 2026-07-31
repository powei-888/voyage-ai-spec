import { SplitCalculatorService } from "./split-calculator.service";
import { toMinorUnits } from "./money";

describe("SplitCalculatorService", () => {
  const calculator = new SplitCalculatorService();

  it("allocates a JPY remainder to the payer first", () => {
    const shares = calculator.equalSplit("100", "JPY", "member-b", [
      "member-a",
      "member-b",
      "member-c"
    ]);

    expect(shares).toEqual([
      { memberId: "member-b", shareAmount: "34" },
      { memberId: "member-a", shareAmount: "33" },
      { memberId: "member-c", shareAmount: "33" }
    ]);
  });

  it("uses stable member id ordering when payer is excluded", () => {
    const shares = calculator.equalSplit("10.00", "USD", "payer", [
      "member-c",
      "member-a",
      "member-b"
    ]);

    expect(shares).toEqual([
      { memberId: "member-a", shareAmount: "3.34" },
      { memberId: "member-b", shareAmount: "3.33" },
      { memberId: "member-c", shareAmount: "3.33" }
    ]);
  });

  it("always preserves the original amount", () => {
    const shares = calculator.equalSplit("123.47", "USD", "a", ["a", "b", "c", "d"]);
    const total = shares.reduce(
      (sum, share) => sum + toMinorUnits(share.shareAmount, "USD"),
      0n
    );

    expect(total).toBe(toMinorUnits("123.47", "USD"));
  });

  it("supports a single participant", () => {
    expect(calculator.equalSplit("9.99", "USD", "a", ["b"])).toEqual([
      { memberId: "b", shareAmount: "9.99" }
    ]);
  });

  it("rejects an empty participant list", () => {
    expect(() => calculator.equalSplit("10", "USD", "a", [])).toThrow(
      "Select at least one expense participant."
    );
  });

  it("rejects duplicate participants", () => {
    expect(() => calculator.equalSplit("10", "USD", "a", ["a", "a"])).toThrow(
      "Each expense participant can be selected only once."
    );
  });
});
