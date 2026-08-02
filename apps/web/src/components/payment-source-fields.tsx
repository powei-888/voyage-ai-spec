"use client";

import type { TripFund, TripMember } from "@voyage/shared";
import { useState } from "react";

export function PaymentSourceFields({
  travelers,
  funds,
  defaultSource = "member",
  defaultPayerMemberId,
  defaultFundId,
  memberLabel = "付款旅伴"
}: {
  travelers: TripMember[];
  funds: TripFund[];
  defaultSource?: "member" | "fund";
  defaultPayerMemberId?: string | null;
  defaultFundId?: string | null;
  memberLabel?: string;
}) {
  const [source, setSource] = useState<"member" | "fund">(
    defaultSource === "fund" && funds.length > 0 ? "fund" : "member"
  );

  return (
    <fieldset className="payment-source-fieldset field-span-2">
      <legend>付款來源</legend>
      <div className="segmented-control" aria-label="付款來源">
        <label className={source === "member" ? "active" : ""}>
          <input
            type="radio"
            name="paymentSource"
            value="member"
            checked={source === "member"}
            onChange={() => setSource("member")}
          />
          旅伴付款
        </label>
        <label className={source === "fund" ? "active" : ""}>
          <input
            type="radio"
            name="paymentSource"
            value="fund"
            checked={source === "fund"}
            disabled={funds.length === 0}
            onChange={() => setSource("fund")}
          />
          公費支付
        </label>
      </div>
      {source === "member" ? (
        <>
          <label className="field">
            <span>{memberLabel}</span>
            <select name="payerMemberId" defaultValue={defaultPayerMemberId || travelers[0]?.id} required>
              {travelers.map((member) => (
                <option value={member.id} key={member.id}>{member.displayName}</option>
              ))}
            </select>
          </label>
          <input type="hidden" name="fundId" value="" />
        </>
      ) : (
        <>
          <label className="field">
            <span>公費帳戶</span>
            <select name="fundId" defaultValue={defaultFundId || funds[0]?.id} required>
              {funds.map((fund) => (
                <option value={fund.id} key={fund.id}>{fund.name} · {fund.currency}</option>
              ))}
            </select>
          </label>
          <input type="hidden" name="payerMemberId" value="" />
        </>
      )}
    </fieldset>
  );
}
