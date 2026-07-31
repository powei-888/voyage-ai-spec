import type { ItineraryDay, Receipt, TripMember } from "@voyage/shared";
import { CheckCircle2, ReceiptText, Upload } from "lucide-react";
import { uploadReceiptAction } from "../../../actions/receipt-actions";
import { EmptyState } from "../../../../components/empty-state";
import { PendingButton } from "../../../../components/pending-button";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { ReceiptReviewCard } from "../../../../components/receipt-review-card";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney, titleCase } from "../../../../lib/format";

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
        eyebrow="收據擷取"
        title="收據"
        description="先確認辨識結果，再建立正式支出紀錄。"
        actions={<a className="button button-primary" href="#upload"><Upload size={17} /> 上傳收據</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">確認佇列</p><h2>待確認</h2></div>
          <span className="count-badge">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="目前沒有待確認項目" body="所有收據草稿都已處理完成。" />
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
        <div className="section-heading"><div><p className="eyebrow">模擬 OCR</p><h2>上傳收據</h2></div></div>
        <form action={uploadReceiptAction.bind(null, tripId)} className="upload-form">
          <label className="file-drop">
            <Upload size={24} />
            <span><strong>選擇收據檔案</strong><small>JPEG、PNG、WebP 或 PDF，檔案上限 8 MB</small></span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
          </label>
          <PendingButton className="button button-primary" type="submit" pendingLabel="辨識中…"><ReceiptText size={17} /> 建立辨識草稿</PendingButton>
        </form>
      </section>

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">處理紀錄</p><h2>已處理收據</h2></div></div>
        {history.length === 0 ? (
          <EmptyState icon={ReceiptText} title="尚無收據紀錄" body="處理完成的收據會顯示在這裡。" />
        ) : (
          <div className="simple-list">
            {history.map((receipt) => (
              <article key={receipt.id}>
                <span className={`state-dot state-${receipt.ocrStatus}`} />
                <div>
                  <strong>{receipt.imageOriginalName || "收據"}</strong>
                  <small>{formatDate(receipt.createdAt)} · {titleCase(receipt.ocrStatus)}</small>
                </div>
                {receipt.confirmedExpense ? (
                  <b>{formatMoney(receipt.confirmedExpense.amount, receipt.confirmedExpense.currency)}</b>
                ) : <span className="status-pill">{titleCase(receipt.ocrStatus)}</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
