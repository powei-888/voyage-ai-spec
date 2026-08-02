import { normalizeProxyPurchaseItems } from "./proxy-purchase-money";

describe("normalizeProxyPurchaseItems", () => {
  it("calculates each subtotal and the exact total for multiple items", () => {
    expect(
      normalizeProxyPurchaseItems(
        [
          { description: "藥妝組", quantity: 2, unitPrice: "350" },
          { description: "抹茶餅乾", quantity: 1, unitPrice: "420", note: "三盒裝" }
        ],
        "JPY"
      )
    ).toEqual({
      items: [
        {
          description: "藥妝組",
          quantity: 2,
          unitPrice: "350",
          amount: "700",
          note: null,
          sortOrder: 0
        },
        {
          description: "抹茶餅乾",
          quantity: 1,
          unitPrice: "420",
          amount: "420",
          note: "三盒裝",
          sortOrder: 1
        }
      ],
      totalAmount: "1120"
    });
  });

  it("uses the trip currency precision for unit prices", () => {
    expect(() =>
      normalizeProxyPurchaseItems(
        [{ description: "商品", quantity: 1, unitPrice: "1.5" }],
        "JPY"
      )
    ).toThrow("JPY supports at most 0 decimal places.");
  });

  it("rejects a whitespace-only product name", () => {
    expect(() =>
      normalizeProxyPurchaseItems(
        [{ description: "   ", quantity: 1, unitPrice: "500" }],
        "JPY"
      )
    ).toThrow("Each proxy-purchase item requires a product name.");
  });
});
