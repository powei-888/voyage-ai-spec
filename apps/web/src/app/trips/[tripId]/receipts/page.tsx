import type { ItineraryDay, Receipt, TripFund, TripMember } from "@voyage/shared";
import { CheckCircle2, Clock3, RefreshCcw, ReceiptText, Trash2, TriangleAlert, Upload } from "lucide-react";
import { deleteReceiptAction, retryReceiptAction, uploadReceiptAction } from "../../../actions/receipt-actions";
import { EmptyState } from "../../../../components/empty-state";
import { PendingButton } from "../../../../components/pending-button";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { ReceiptReviewCard } from "../../../../components/receipt-review-card";
import { ReceiptQueueRefresher } from "../../../../components/receipt-queue-refresher";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney, titleCase } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function ReceiptsPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [receipts, members, days, funds] = await Promise.all([
    apiGet<Receipt[]>(`/trips/${tripId}/receipts`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`),
    apiGet<ItineraryDay[]>(`/trips/${tripId}/itinerary-days`),
    apiGet<TripFund[]>(`/trips/${tripId}/funds`)
  ]);
  const events = days.flatMap((day) => day.events);
  const pending = receipts.filter((receipt) => receipt.ocrStatus === "extracted");
  const queue = receipts.filter((receipt) => ["pending", "processing", "failed"].includes(receipt.ocrStatus));
  const history = receipts.filter((receipt) => receipt.ocrStatus === "confirmed");
  const queueActive = queue.some((receipt) => receipt.ocrStatus !== "failed");

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="收據擷取"
        title="收據"
        description="核對原文與繁中翻譯，指派代購明細後再建立正式支出。"
        actions={<a className="button button-primary" href="#upload"><Upload size={17} /> 上傳收據</a>}
      />
      <Notice error={query.error} notice={query.notice} />
      <ReceiptQueueRefresher active={queueActive} />

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
                funds={funds}
                events={events}
                key={receipt.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">背景工作</p><h2>辨識佇列</h2></div>
          <span className="count-badge">{queue.length}</span>
        </div>
        {queue.length === 0 ? (
          <EmptyState icon={Clock3} title="辨識佇列是空的" body="新上傳的收據會在背景依序處理。" />
        ) : (
          <div className="receipt-queue-list">
            {queue.map((receipt) => {
              const failed = receipt.ocrStatus === "failed";
              const retrying = receipt.ocrStatus === "pending" && receipt.ocrAttemptCount > 0;
              const label = failed ? "辨識失敗" : retrying ? "等待自動重試" : receipt.ocrStatus === "processing" ? "正在辨識" : "等待處理";
              return (
                <article key={receipt.id} className={failed ? "queue-failed" : ""}>
                  <span className="queue-icon" aria-hidden="true">
                    {failed ? <TriangleAlert size={18} /> : <Clock3 size={18} />}
                  </span>
                  <div className="queue-copy">
                    <strong>{receipt.imageOriginalName || "收據"}</strong>
                    <small>{label} · 第 {receipt.ocrAttemptCount}/{receipt.ocrMaxAttempts} 次</small>
                    {failed && receipt.ocrLastError ? <p>{receipt.ocrLastError}</p> : null}
                  </div>
                  <div className="queue-actions">
                    {failed ? (
                      <form action={retryReceiptAction.bind(null, tripId, receipt.id)}>
                        <PendingButton className="button button-secondary button-compact" type="submit" pendingLabel="排程中…">
                          <RefreshCcw size={15} /> 重新辨識
                        </PendingButton>
                      </form>
                    ) : <span className="status-pill">{label}</span>}
                    <form action={deleteReceiptAction.bind(null, tripId, receipt.id)}>
                      <button className="icon-button danger" type="submit" title="刪除收據"><Trash2 size={15} /></button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="form-panel upload-panel" id="upload">
        <div className="section-heading"><div><p className="eyebrow">地端 OCR + Qwen 翻譯</p><h2>上傳收據</h2></div></div>
        <form action={uploadReceiptAction.bind(null, tripId)} className="upload-form">
          <label className="file-drop">
            <Upload size={24} />
            <span><strong>選擇收據檔案</strong><small>JPEG、PNG、WebP 或 PDF，檔案上限 8 MB</small></span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
          </label>
          <PendingButton className="button button-primary" type="submit" pendingLabel="上傳中…"><ReceiptText size={17} /> 加入辨識佇列</PendingButton>
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
