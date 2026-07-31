import type { ItineraryDay, Receipt, TripMember } from "@voyage/shared";
import { CheckCircle2, ReceiptText, Upload } from "lucide-react";
import { uploadReceiptAction } from "../../../actions/receipt-actions";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { ReceiptReviewCard } from "../../../../components/receipt-review-card";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function ReceiptsPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [receipts, members, days] = await Promise.all([
    apiGet<Receipt[]>(`/trips/${tripId}/receipts`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`),
    apiGet<ItineraryDay[]>(`/trips/${tripId}/itinerary-days`)
  ]);
  const events = days.flatMap((day) => day.events);
  const pending = receipts.filter((receipt) => receipt.ocrStatus === "extracted");
  const history = receipts.filter((receipt) => receipt.ocrStatus !== "extracted");

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Capture"
        title="Receipts"
        description="Review extraction before it becomes a financial record."
        actions={<a className="button button-primary" href="#upload"><Upload size={17} /> Upload</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">Confirmation queue</p><h2>Needs review</h2></div>
          <span className="count-badge">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Queue is clear" body="No extracted receipts are waiting for confirmation." />
        ) : (
          <div className="receipt-review-list">
            {pending.map((receipt) => (
              <ReceiptReviewCard
                tripId={tripId}
                receipt={receipt}
                members={members}
                events={events}
                key={receipt.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="form-panel upload-panel" id="upload">
        <div className="section-heading"><div><p className="eyebrow">Mock OCR</p><h2>Upload receipt</h2></div></div>
        <form action={uploadReceiptAction.bind(null, tripId)} className="upload-form">
          <label className="file-drop">
            <Upload size={24} />
            <span><strong>Select receipt</strong><small>JPEG, PNG, WebP, or PDF · 8 MB max</small></span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
          </label>
          <button className="button button-primary" type="submit"><ReceiptText size={17} /> Extract draft</button>
        </form>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">History</p><h2>Processed receipts</h2></div></div>
        {history.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No receipt history" body="Processed drafts will appear here." />
        ) : (
          <div className="simple-list">
            {history.map((receipt) => (
              <article key={receipt.id}>
                <span className={`state-dot state-${receipt.ocrStatus}`} />
                <div>
                  <strong>{receipt.imageOriginalName || "Receipt"}</strong>
                  <small>{formatDate(receipt.createdAt)} · {receipt.ocrStatus}</small>
                </div>
                {receipt.confirmedExpense ? (
                  <b>{formatMoney(receipt.confirmedExpense.amount, receipt.confirmedExpense.currency)}</b>
                ) : <span className="status-pill">{receipt.ocrStatus}</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
