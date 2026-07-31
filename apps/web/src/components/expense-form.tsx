import type { Expense, ItineraryEvent, Trip, TripMember } from "@voyage/shared";
import { Save } from "lucide-react";
import { toDateInput, titleCase } from "../lib/format";
import { EXPENSE_CATEGORIES } from "../lib/options";
import { ExpenseSplitFields } from "./expense-split-fields";
import { PendingButton } from "./pending-button";

export function ExpenseForm({
  action,
  trip,
  members,
  events,
  expense,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  trip: Trip;
  members: TripMember[];
  events: ItineraryEvent[];
  expense?: Expense;
  submitLabel: string;
}) {
  const travelers = members.filter((member) => member.kind === "traveler");
  return (
    <form action={action} className="form-grid">
      <label className="field field-span-2">
        <span>標題</span>
        <input name="title" defaultValue={expense?.title} placeholder="晚餐" required />
      </label>
      <label className="field">
        <span>商家</span>
        <input name="merchant" defaultValue={expense?.merchant || ""} placeholder="餐廳" />
      </label>
      <label className="field">
        <span>分類</span>
        <select name="category" defaultValue={expense?.category || "food"}>
          {EXPENSE_CATEGORIES.map((category) => (
            <option value={category} key={category}>{titleCase(category)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>金額</span>
        <div className="input-affix">
          <span>{trip.baseCurrency}</span>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={expense?.amount}
            placeholder="3000"
            required
          />
        </div>
        <input type="hidden" name="currency" value={trip.baseCurrency} />
      </label>
      <label className="field">
        <span>日期</span>
        <input
          name="expenseDate"
          type="date"
          defaultValue={expense?.expenseDate ? toDateInput(expense.expenseDate) : ""}
        />
      </label>
      <label className="field">
        <span>付款人</span>
        <select name="payerMemberId" defaultValue={expense?.payerMemberId || travelers[0]?.id} required>
          {travelers.map((member) => (
            <option value={member.id} key={member.id}>{member.displayName}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>關聯行程</span>
        <select name="linkedEventId" defaultValue={expense?.linkedEventId || ""}>
          <option value="">不關聯行程</option>
          {events.map((event) => (
            <option value={event.id} key={event.id}>{event.title}</option>
          ))}
        </select>
      </label>
      <ExpenseSplitFields members={members} expense={expense} />
      <div className="form-actions field-span-2">
        <PendingButton
          className="button button-primary"
          type="submit"
          pendingLabel="儲存中…"
        >
          <Save size={16} /> {submitLabel}
        </PendingButton>
      </div>
    </form>
  );
}
