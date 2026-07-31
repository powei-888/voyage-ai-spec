"use client";

import type { Expense, TripMember } from "@voyage/shared";
import { useState } from "react";

export function ExpenseSplitFields({
  members,
  expense
}: {
  members: TripMember[];
  expense?: Expense;
}) {
  const [method, setMethod] = useState<"equal" | "custom">(
    expense?.splitMethod || "equal"
  );
  const selected = new Set(
    expense?.participants.map((participant) => participant.memberId) ||
      members
        .filter((member) => member.kind === "traveler")
        .map((member) => member.id)
  );
  const shares = new Map(
    expense?.participants.map((participant) => [
      participant.memberId,
      participant.shareAmount
    ]) || []
  );

  return (
    <fieldset className="split-fieldset field-span-2">
      <legend>分攤方式</legend>
      <div className="segmented-control" aria-label="分攤方式">
        <label className={method === "equal" ? "active" : ""}>
          <input
            type="radio"
            name="splitMethod"
            value="equal"
            checked={method === "equal"}
            onChange={() => setMethod("equal")}
          />
          平均分攤
        </label>
        <label className={method === "custom" ? "active" : ""}>
          <input
            type="radio"
            name="splitMethod"
            value="custom"
            checked={method === "custom"}
            onChange={() => setMethod("custom")}
          />
          自訂金額
        </label>
      </div>
      <div className={`split-member-grid split-${method}`}>
        {members.map((member) => (
          <label key={member.id}>
            <span className="split-member-name">
              <input
                type="checkbox"
                name="participantMemberIds"
                value={member.id}
                defaultChecked={selected.has(member.id)}
              />
              <span>
                {member.displayName}
                {member.kind === "external" ? <small className="party-kind">代購</small> : null}
              </span>
            </span>
            {method === "custom" ? (
              <input
                aria-label={`${member.displayName} 分攤金額`}
                name={`shareAmount:${member.id}`}
                inputMode="decimal"
                defaultValue={shares.get(member.id) || ""}
                placeholder="0"
              />
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
