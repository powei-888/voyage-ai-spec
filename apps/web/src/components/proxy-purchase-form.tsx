"use client";

import type { ProxyPurchase, Trip, TripFund, TripMember } from "@voyage/shared";
import { Plus, Save, ShoppingBag, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { formatMoney } from "../lib/format";
import { PendingButton } from "./pending-button";
import { PaymentSourceFields } from "./payment-source-fields";

type FormItem = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  note: string;
};

export function ProxyPurchaseForm({
  action,
  trip,
  externalMembers,
  travelers,
  funds,
  today,
  purchase,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  trip: Trip;
  externalMembers: TripMember[];
  travelers: TripMember[];
  funds: TripFund[];
  today: string;
  purchase?: ProxyPurchase;
  submitLabel: string;
}) {
  const editing = Boolean(purchase);
  const nextKey = useRef(purchase?.items.length ?? 1);
  const [partyMode, setPartyMode] = useState<"existing" | "new">(
    externalMembers.length > 0 ? "existing" : "new"
  );
  const [purchaseState, setPurchaseState] = useState<"requested" | "purchased">(
    "requested"
  );
  const [items, setItems] = useState<FormItem[]>(
    purchase?.items.map((item) => ({
      key: item.id,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: item.unitPrice,
      note: item.note || ""
    })) ?? [{ key: "item-0", description: "", quantity: "1", unitPrice: "", note: "" }]
  );

  const updateItem = (key: string, field: keyof Omit<FormItem, "key">, value: string) => {
    setItems((current) =>
      current.map((item) => item.key === key ? { ...item, [field]: value } : item)
    );
  };
  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  return (
    <form action={action} className="proxy-form">
      {!editing ? (
        <fieldset className="proxy-choice-group">
          <legend>代購對象</legend>
          {externalMembers.length > 0 ? (
            <div className="segmented-control" aria-label="代購對象來源">
              <label className={partyMode === "existing" ? "active" : ""}>
                <input
                  type="radio"
                  name="partyMode"
                  value="existing"
                  checked={partyMode === "existing"}
                  onChange={() => setPartyMode("existing")}
                />
                選擇現有對象
              </label>
              <label className={partyMode === "new" ? "active" : ""}>
                <input
                  type="radio"
                  name="partyMode"
                  value="new"
                  checked={partyMode === "new"}
                  onChange={() => setPartyMode("new")}
                />
                建立新對象
              </label>
            </div>
          ) : <input type="hidden" name="partyMode" value="new" />}
          {partyMode === "existing" ? (
            <label className="field">
              <span>外部對象</span>
              <select name="externalMemberId" defaultValue={purchase?.externalMemberId || externalMembers[0]?.id} required>
                {externalMembers.map((member) => (
                  <option value={member.id} key={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>新對象名稱</span>
              <input name="newExternalName" placeholder="例如：小美媽媽" required maxLength={80} />
            </label>
          )}
        </fieldset>
      ) : (
        <label className="field">
          <span>代購對象</span>
          <select name="externalMemberId" defaultValue={purchase?.externalMemberId} required>
            {externalMembers.map((member) => (
              <option value={member.id} key={member.id}>{member.displayName}</option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="proxy-items-builder">
        <div className="proxy-builder-heading">
          <legend>代購商品</legend>
          <button
            className="button button-secondary button-compact"
            type="button"
            onClick={() => {
              const key = `item-${nextKey.current}`;
              nextKey.current += 1;
              setItems((current) => [
                ...current,
                { key, description: "", quantity: "1", unitPrice: "", note: "" }
              ]);
            }}
          >
            <Plus size={15} /> 新增品項
          </button>
        </div>
        <div className="proxy-builder-list">
          {items.map((item, index) => (
            <div className="proxy-builder-row" key={item.key}>
              <span className="proxy-item-number">{index + 1}</span>
              <label className="field proxy-product-name">
                <span>商品名稱</span>
                <input
                  name="itemDescription"
                  value={item.description}
                  onChange={(event) => updateItem(item.key, "description", event.target.value)}
                  placeholder="商品或規格"
                  required
                  maxLength={160}
                />
              </label>
              <label className="field proxy-product-quantity">
                <span>數量</span>
                <input
                  name="itemQuantity"
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, "quantity", event.target.value)}
                  required
                />
              </label>
              <label className="field proxy-product-price">
                <span>單價（{trip.baseCurrency}）</span>
                <input
                  name="itemUnitPrice"
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(event) => updateItem(item.key, "unitPrice", event.target.value)}
                  placeholder="0"
                  required
                />
              </label>
              <label className="field proxy-product-note">
                <span>品項備註（選填）</span>
                <input
                  name="itemNote"
                  value={item.note}
                  onChange={(event) => updateItem(item.key, "note", event.target.value)}
                  placeholder="顏色、尺寸或口味"
                  maxLength={240}
                />
              </label>
              <strong className="proxy-line-preview">
                {formatMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), trip.baseCurrency)}
              </strong>
              <button
                className="icon-button danger"
                type="button"
                title="移除品項"
                disabled={items.length === 1}
                onClick={() => setItems((current) => current.filter((candidate) => candidate.key !== item.key))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="proxy-builder-total">
          <span>{items.length} 項商品</span>
          <strong>{formatMoney(total, trip.baseCurrency)}</strong>
        </div>
      </fieldset>

      <label className="field">
        <span>整張代購單備註（選填）</span>
        <textarea name="note" rows={3} defaultValue={purchase?.note || ""} maxLength={500} />
      </label>

      {!editing ? (
        <fieldset className="proxy-choice-group">
          <legend>建立狀態</legend>
          <div className="segmented-control" aria-label="建立狀態">
            <label className={purchaseState === "requested" ? "active" : ""}>
              <input
                type="radio"
                name="purchaseState"
                value="requested"
                checked={purchaseState === "requested"}
                onChange={() => setPurchaseState("requested")}
              />
              待購買
            </label>
            <label className={purchaseState === "purchased" ? "active" : ""}>
              <input
                type="radio"
                name="purchaseState"
                value="purchased"
                checked={purchaseState === "purchased"}
                onChange={() => setPurchaseState("purchased")}
              />
              已購買並入帳
            </label>
          </div>
          {purchaseState === "purchased" ? (
            <div className="proxy-payment-fields">
              <PaymentSourceFields travelers={travelers} funds={funds} memberLabel="墊付旅伴" />
              <label className="field">
                <span>購買日期</span>
                <input name="purchasedAt" type="date" defaultValue={today} required />
              </label>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <div className="form-actions">
        <PendingButton className="button button-primary" type="submit" pendingLabel="儲存中…">
          {editing ? <Save size={16} /> : <ShoppingBag size={16} />} {submitLabel}
        </PendingButton>
      </div>
    </form>
  );
}
