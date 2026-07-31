import type { Expense, ItineraryEvent, Trip, TripMember } from "@voyage/shared";
import { Save } from "lucide-react";
import { toDateInput, titleCase } from "../lib/format";
import { EXPENSE_CATEGORIES } from "../lib/options";
import { MemberChecks } from "./member-checks";

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
  const selected = expense?.participants.map((item) => item.memberId) ?? [];

  return (
    <form action={action} className="form-grid">
      <label className="field field-span-2">
        <span>Title</span>
        <input name="title" defaultValue={expense?.title} placeholder="Dinner" required />
      </label>
      <label className="field">
        <span>Merchant</span>
        <input name="merchant" defaultValue={expense?.merchant || ""} placeholder="Restaurant" />
      </label>
      <label className="field">
        <span>Category</span>
        <select name="category" defaultValue={expense?.category || "food"}>
          {EXPENSE_CATEGORIES.map((category) => (
            <option value={category} key={category}>{titleCase(category)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Amount</span>
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
        <span>Date</span>
        <input
          name="expenseDate"
          type="date"
          defaultValue={expense?.expenseDate ? toDateInput(expense.expenseDate) : ""}
        />
      </label>
      <label className="field">
        <span>Paid by</span>
        <select name="payerMemberId" defaultValue={expense?.payerMemberId || members[0]?.id} required>
          {members.map((member) => (
            <option value={member.id} key={member.id}>{member.displayName}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Linked event</span>
        <select name="linkedEventId" defaultValue={expense?.linkedEventId || ""}>
          <option value="">No linked event</option>
          {events.map((event) => (
            <option value={event.id} key={event.id}>{event.title}</option>
          ))}
        </select>
      </label>
      <MemberChecks
        members={members}
        selectedIds={selected}
        defaultAll={!expense}
      />
      <div className="form-actions field-span-2">
        <button className="button button-primary" type="submit">
          <Save size={16} /> {submitLabel}
        </button>
      </div>
    </form>
  );
}
