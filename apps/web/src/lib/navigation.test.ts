import { safeReturnPath } from "./navigation";

describe("safeReturnPath", () => {
  it("keeps an internal invitation path", () => {
    expect(safeReturnPath("/invite/abc?source=qr")).toBe("/invite/abc?source=qr");
  });

  it.each([
    "https://example.com",
    "//example.com/path",
    "/\\example.com/path",
    "javascript:alert(1)",
    ""
  ])("rejects unsafe return target %s", (value) => {
    expect(safeReturnPath(value, "/fallback")).toBe("/fallback");
  });
});
