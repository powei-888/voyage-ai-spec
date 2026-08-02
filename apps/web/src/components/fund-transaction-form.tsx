"use client";

import type { FundTransactionType, TripMember } from "@voyage/shared";
import { Save } from "lucide-react";
import { useState } from "react";
import { PendingButton } from "./pending-button";

export function FundTransactionForm({
  action,
  travelers,
  currency,
  today
}: {
  action: (formData: FormData) => Promise<void>;
  travelers: TripMember[];
  currency: string;
  today: string;
}) {
  const [type, setType] = useState<Exclude<FundTransactionType, "collection">>("contribution");
  const needsMember = type === "contribution" || type === "refund";

  return (
    <form action={action} className="form-grid">
      <label className="field">
        <span>流水類型</span>
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
        >
          <option value="contribution">旅伴繳交</option>
          <option value="refund">退回旅伴</option>
          <option value="adjustment_credit">餘額增加調整</option>
          <option value="adjustment_debit">餘額減少調整</option>
        </select>
      </label>
      {needsMember ? (
        <label className="field">
          <span>旅伴</span>
          <select name="memberId" defaultValue={travelers[0]?.id} required>
            {travelers.map((member) => (
              <option value={member.id} key={member.id}>{member.displayName}</option>
            ))}
          </select>
        </label>
      ) : <input type="hidden" name="memberId" value="" />}
      <label className="field">
        <span>金額</span>
        <div className="input-affix">
          <span>{currency}</span>
          <input name="amount" inputMode="decimal" placeholder="0" required />
        </div>
      </label>
      <label className="field">
        <span>日期</span>
        <input name="transactionDate" type="date" defaultValue={today} required />
      </label>
      <label className="field field-span-2">
        <span>備註</span>
        <input name="note" placeholder="現金、轉帳或調整原因" maxLength={240} />
      </label>
      <div className="form-actions field-span-2">
        <PendingButton className="button button-primary" type="submit" pendingLabel="記錄中…">
          <Save size={16} /> 記錄流水
        </PendingButton>
      </div>
    </form>
  );
}
