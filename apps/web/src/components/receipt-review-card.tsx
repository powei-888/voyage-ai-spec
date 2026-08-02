import type { ItineraryEvent, Receipt, TripFund, TripMember } from "@voyage/shared";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Languages,
  RefreshCw,
  Save,
  Trash2
} from "lucide-react";
import {
  createReceiptProxyPurchaseAction,
  deleteReceiptAction,
  reviewReceiptAction,
  saveReceiptTranslationsAction,
  translateReceiptItemsAction
} from "../app/actions/receipt-actions";
import { apiAssetUrl } from "../lib/api";
import { formatMoney, titleCase } from "../lib/format";
import { EXPENSE_CATEGORIES } from "../lib/options";
import { ConfirmForm } from "./confirm-form";
import { ExpenseSplitFields } from "./expense-split-fields";
import { PendingButton } from "./pending-button";
import { PaymentSourceFields } from "./payment-source-fields";
import { ReceiptProxyImportForm } from "./receipt-proxy-import-form";

const translationLabels = {
  pending: "待翻譯",
  translated: "已翻譯",
  failed: "翻譯失敗"
} as const;

export function ReceiptReviewCard({
  tripId,
  receipt,
  members,
  funds,
  events
}: {
  tripId: string;
  receipt: Receipt;
  members: TripMember[];
  funds: TripFund[];
  events: ItineraryEvent[];
}) {
  const extracted = receipt.extractedJson;
  if (!extracted) return null;
  const imageUrl = apiAssetUrl(receipt.imageUrl);
  const isImage = receipt.imageMimeType?.startsWith("image/");
  const travelers = members.filter((member) => member.kind === "traveler");
  const externalMembers = members.filter((member) => member.kind === "external");
  const items = extracted.items ?? [];
  const activePurchases = receipt.proxyPurchases.filter(
    (purchase) => purchase.status !== "cancelled"
  );
  const assignments: Record<number, string> = {};
  for (const purchase of activePurchases) {
    for (const item of purchase.items) {
      if (item.sourceReceiptItemIndex !== null) {
        assignments[item.sourceReceiptItemIndex] = purchase.externalMember.displayName;
      }
    }
  }
  const assignedIndexes = Object.keys(assignments).map(Number);
  const proxyAmount = assignedIndexes.reduce(
    (sum, index) => sum + Number(items[index]?.amount ?? 0),
    0
  );
  const travelerAmount = Math.max(0, Number(extracted.amount) - proxyAmount);
  const hasTranslations = items.some((item) => item.translationStatus === "translated");
  const lowConfidence = Number(receipt.confidenceScore) < 0.7;

  return (
    <article className="receipt-review">
      <div className="receipt-preview">
        {isImage ? (
          <img src={imageUrl} alt={`收據 ${receipt.imageOriginalName || "預覽"}`} />
        ) : (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <ImageIcon size={24} /> 開啟收據文件
          </a>
        )}
        <span className="confidence">
          {Math.round(Number(receipt.confidenceScore) * 100)}% 辨識信心
        </span>
      </div>
      <div className="receipt-form">
        <div className="section-heading">
          <div>
            <p className="eyebrow">待確認</p>
            <h2>{receipt.imageOriginalName || "收據草稿"}</h2>
          </div>
          <ConfirmForm
            action={deleteReceiptAction.bind(null, tripId, receipt.id)}
            message="要刪除這份收據草稿與上傳檔案嗎？"
          >
            <button className="icon-button danger" type="submit" title="刪除收據草稿">
              <Trash2 size={16} />
            </button>
          </ConfirmForm>
        </div>

        {items.length > 0 ? (
          <section className="receipt-line-workspace">
            <div className="receipt-workspace-heading">
              <span><Languages size={16} /> 明細翻譯</span>
              <form action={translateReceiptItemsAction.bind(null, tripId, receipt.id)}>
                <PendingButton
                  className="button button-ghost button-compact"
                  type="submit"
                  pendingLabel="翻譯中…"
                >
                  <RefreshCw size={14} />
                  {hasTranslations ? "重新翻譯" : "地端 AI 翻譯"}
                </PendingButton>
              </form>
            </div>
            {lowConfidence ? (
              <div className="receipt-confidence-warning">
                <AlertTriangle size={15} />
                OCR 信心偏低，請先核對原文與金額
              </div>
            ) : null}
            <form
              action={saveReceiptTranslationsAction.bind(null, tripId, receipt.id)}
              className="receipt-translation-form"
            >
              <div className="receipt-translation-list">
                {items.map((item, index) => (
                  <div className="receipt-translation-row" key={`${item.description}-${index}`}>
                    <div className="receipt-translation-copy">
                      <span className="receipt-original-label">
                        原文{item.originalLanguage ? ` · ${item.originalLanguage}` : ""}
                      </span>
                      <strong>{item.description}</strong>
                      <small>
                        {item.quantity ? `數量 ${item.quantity}` : ""}
                        {item.quantity && item.unitPrice ? " · " : ""}
                        {item.unitPrice
                          ? `單價 ${extracted.currency} ${item.unitPrice}`
                          : ""}
                      </small>
                    </div>
                    <label className="receipt-translation-input">
                      <span>繁體中文</span>
                      <input type="hidden" name="translationIndex" value={index} />
                      <input
                        name="translatedDescription"
                        defaultValue={item.translatedDescription || ""}
                        placeholder={item.description}
                        maxLength={160}
                        required
                      />
                    </label>
                    <div className="receipt-translation-meta">
                      <span
                        className={`translation-status status-${item.translationStatus}`}
                        title={item.translationModel || undefined}
                      >
                        {item.translationSource === "manual"
                          ? "人工修正"
                          : translationLabels[item.translationStatus]}
                      </span>
                      <b>{formatMoney(item.amount, extracted.currency)}</b>
                    </div>
                  </div>
                ))}
              </div>
              <div className="receipt-workspace-actions">
                <PendingButton
                  className="button button-secondary button-compact"
                  type="submit"
                  pendingLabel="儲存中…"
                >
                  <Save size={14} /> 儲存翻譯修正
                </PendingButton>
              </div>
            </form>

            <ReceiptProxyImportForm
              action={createReceiptProxyPurchaseAction.bind(null, tripId, receipt.id)}
              items={items}
              currency={extracted.currency}
              externalMembers={externalMembers}
              assignments={assignments}
            />
          </section>
        ) : null}

        <form action={reviewReceiptAction.bind(null, tripId, receipt.id)} className="form-grid">
          <label className="field field-span-2">
            <span>標題</span>
            <input name="title" defaultValue={extracted.merchant || "收據支出"} required />
          </label>
          <label className="field">
            <span>商家</span>
            <input name="merchant" defaultValue={extracted.merchant} />
          </label>
          <label className="field">
            <span>分類</span>
            <select name="category" defaultValue={extracted.category || "other"}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option value={category} key={category}>{titleCase(category)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>金額</span>
            <div className="input-affix">
              <span>{extracted.currency}</span>
              <input name="amount" defaultValue={extracted.amount} required />
            </div>
            <input name="currency" type="hidden" value={extracted.currency} />
          </label>
          <label className="field">
            <span>日期</span>
            <input name="expenseDate" type="date" defaultValue={extracted.date} />
          </label>
          <label className="field">
            <span>關聯行程</span>
            <select name="linkedEventId" defaultValue="">
              <option value="">不關聯行程</option>
              {events.map((event) => (
                <option value={event.id} key={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
          <PaymentSourceFields travelers={travelers} funds={funds} />
          {activePurchases.length > 0 ? (
            <div className="receipt-proxy-summary field-span-2">
              <span>
                <strong>代購分攤</strong>
                {formatMoney(String(proxyAmount), extracted.currency)}
              </span>
              <span>
                <strong>旅伴剩餘分攤</strong>
                {formatMoney(String(travelerAmount), extracted.currency)}
              </span>
              <small>確認後會建立一筆收據支出，並同步完成相關代購單的購買紀錄。</small>
            </div>
          ) : null}
          <ExpenseSplitFields members={activePurchases.length > 0 ? travelers : members} />
          <div className="form-actions field-span-2">
            <PendingButton
              className="button button-secondary"
              name="intent"
              value="save"
              type="submit"
              pendingLabel="儲存中…"
            >
              <Save size={16} /> 儲存草稿
            </PendingButton>
            <PendingButton
              className="button button-primary"
              name="intent"
              value="confirm"
              type="submit"
              pendingLabel="建立中…"
            >
              <CheckCircle2 size={17} /> 確認並建立支出
            </PendingButton>
          </div>
        </form>
      </div>
    </article>
  );
}
