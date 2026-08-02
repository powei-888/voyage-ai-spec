"use client";

import type { ReceiptLineItem, TripMember } from "@voyage/shared";
import { ShoppingBag, UserPlus } from "lucide-react";
import { useState } from "react";
import { PendingButton } from "./pending-button";

type ReceiptProxyImportFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  items: ReceiptLineItem[];
  currency: string;
  externalMembers: TripMember[];
  assignments: Record<number, string>;
};

export function ReceiptProxyImportForm({
  action,
  items,
  currency,
  externalMembers,
  assignments
}: ReceiptProxyImportFormProps) {
  const [mode, setMode] = useState<"existing" | "new">(
    externalMembers.length > 0 ? "existing" : "new"
  );
  const [selected, setSelected] = useState<number[]>([]);
  const available = items
    .map((_item, index) => index)
    .filter((index) => !assignments[index]);

  return (
    <form action={action} className="receipt-proxy-form">
      <div className="receipt-workspace-heading">
        <span><ShoppingBag size={16} /> 指派代購明細</span>
        <small>{available.length > 0 ? `${available.length} 項可指派` : "已全部指派"}</small>
      </div>
      <div className="receipt-proxy-select-list">
        {items.map((item, index) => (
          <div
            className={assignments[index] ? "receipt-proxy-item assigned" : "receipt-proxy-item"}
            key={`${item.description}-${index}`}
          >
            {assignments[index] ? (
              <span className="status-pill">已指派給 {assignments[index]}</span>
            ) : (
              <input
                type="checkbox"
                name="itemIndexes"
                value={index}
                aria-label={`選擇 ${item.translatedDescription || item.description}`}
                checked={selected.includes(index)}
                onChange={(event) => setSelected((current) =>
                  event.target.checked
                    ? [...current, index]
                    : current.filter((itemIndex) => itemIndex !== index)
                )}
              />
            )}
            <span>
              <strong>{item.translatedDescription || item.description}</strong>
              {item.translatedDescription ? <small>{item.description}</small> : null}
            </span>
            {assignments[index] ? (
              <b>{currency} {item.amount}</b>
            ) : (
              <label className="receipt-proxy-amount">
                <span>分攤金額</span>
                <input
                  name={`itemAmount:${index}`}
                  inputMode="decimal"
                  defaultValue={item.amount}
                  disabled={!selected.includes(index)}
                  required={selected.includes(index)}
                />
              </label>
            )}
          </div>
        ))}
      </div>
      {available.length > 0 ? (
        <>
          <fieldset className="receipt-recipient-fieldset">
            <legend>代購對象</legend>
            <div className="segmented-control">
              {externalMembers.length > 0 ? (
                <label className={mode === "existing" ? "active" : ""}>
                  <input
                    type="radio"
                    checked={mode === "existing"}
                    onChange={() => setMode("existing")}
                  />
                  既有對象
                </label>
              ) : null}
              <label className={mode === "new" ? "active" : ""}>
                <input
                  type="radio"
                  checked={mode === "new"}
                  onChange={() => setMode("new")}
                />
                <UserPlus size={14} /> 新對象
              </label>
            </div>
            {mode === "existing" ? (
              <select name="externalMemberId" defaultValue={externalMembers[0]?.id} required>
                {externalMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            ) : (
              <input
                name="newExternalName"
                maxLength={80}
                placeholder="代購對象姓名"
                required
              />
            )}
          </fieldset>
          <label className="field">
            <span>代購備註</span>
            <input name="note" maxLength={500} placeholder="選填" />
          </label>
          <PendingButton
            className="button button-secondary"
            type="submit"
            pendingLabel="建立中…"
            disabled={selected.length === 0}
          >
            <ShoppingBag size={16} /> 建立待確認代購單
          </PendingButton>
        </>
      ) : (
        <div className="receipt-proxy-complete">
          <ShoppingBag size={16} />
          所有明細皆已指派代購對象
        </div>
      )}
    </form>
  );
}
