import type { ItineraryEvent, Receipt, TripMember } from "@voyage/shared";
import { CheckCircle2, ImageIcon } from "lucide-react";
import { confirmReceiptAction } from "../app/actions/receipt-actions";
import { apiAssetUrl } from "../lib/api";
import { titleCase } from "../lib/format";
import { EXPENSE_CATEGORIES } from "../lib/options";
import { MemberChecks } from "./member-checks";

export function ReceiptReviewCard({
  tripId,
  receipt,
  members,
  events
}: {
  tripId: string;
  receipt: Receipt;
  members: TripMember[];
  events: ItineraryEvent[];
}) {
  const extracted = receipt.extractedJson;
  if (!extracted) return null;
  const imageUrl = apiAssetUrl(receipt.imageUrl);
  const isImage = receipt.imageMimeType?.startsWith("image/");

  return (
    <article className="receipt-review">
      <div className="receipt-preview">
        {isImage ? (
          <img src={imageUrl} alt={`Receipt ${receipt.imageOriginalName || "preview"}`} />
        ) : (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <ImageIcon size={24} /> Open receipt document
          </a>
        )}
        <span className="confidence">{Math.round(Number(receipt.confidenceScore) * 100)}% confidence</span>
      </div>
      <div className="receipt-form">
        <div className="section-heading">
          <div><p className="eyebrow">Needs review</p><h2>{receipt.imageOriginalName || "Receipt draft"}</h2></div>
        </div>
        <form action={confirmReceiptAction.bind(null, tripId, receipt.id)} className="form-grid">
          <label className="field field-span-2">
            <span>Title</span>
            <input name="title" defaultValue={extracted.merchant || "Receipt expense"} required />
          </label>
          <label className="field">
            <span>Merchant</span>
            <input name="merchant" defaultValue={extracted.merchant} />
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={extracted.category || "other"}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option value={category} key={category}>{titleCase(category)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount</span>
            <div className="input-affix">
              <span>{extracted.currency}</span>
              <input name="amount" defaultValue={extracted.amount} required />
            </div>
            <input name="currency" type="hidden" value={extracted.currency} />
          </label>
          <label className="field">
            <span>Date</span>
            <input name="expenseDate" type="date" defaultValue={extracted.date} />
          </label>
          <label className="field">
            <span>Paid by</span>
            <select name="payerMemberId" defaultValue={members[0]?.id} required>
              {members.map((member) => (
                <option value={member.id} key={member.id}>{member.displayName}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Linked event</span>
            <select name="linkedEventId" defaultValue="">
              <option value="">No linked event</option>
              {events.map((event) => (
                <option value={event.id} key={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
          <MemberChecks members={members} defaultAll />
          <div className="form-actions field-span-2">
            <button className="button button-primary" type="submit">
              <CheckCircle2 size={17} /> Confirm and create expense
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
