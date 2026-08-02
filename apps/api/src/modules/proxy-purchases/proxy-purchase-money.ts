import { DomainError } from "../../common/domain-error";
import { fromMinorUnits, toMinorUnits } from "../expenses/money";
import { ProxyPurchaseItemDto } from "./proxy-purchases.dto";

export type NormalizedProxyPurchaseItem = {
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  note: string | null;
  sortOrder: number;
};

export function normalizeProxyPurchaseItems(
  items: ProxyPurchaseItemDto[],
  currency: string
): { items: NormalizedProxyPurchaseItem[]; totalAmount: string } {
  const normalized = items.map((item, sortOrder) => {
    const description = item.description.trim();
    if (!description) {
      throw new DomainError(
        "PROXY_PURCHASE_ITEM_REQUIRED",
        "Each proxy-purchase item requires a product name."
      );
    }
    const unitPriceMinor = toMinorUnits(item.unitPrice, currency);
    return {
      description,
      quantity: item.quantity,
      unitPrice: fromMinorUnits(unitPriceMinor, currency),
      amount: fromMinorUnits(unitPriceMinor * BigInt(item.quantity), currency),
      note: item.note?.trim() || null,
      sortOrder
    };
  });
  const totalMinor = normalized.reduce(
    (sum, item) => sum + toMinorUnits(item.amount, currency),
    0n
  );
  return {
    items: normalized,
    totalAmount: fromMinorUnits(totalMinor, currency)
  };
}
