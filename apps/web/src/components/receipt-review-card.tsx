import type { ItineraryEvent, Receipt, TripMember } from "@voyage/shared";
import { CheckCircle2, ImageIcon, Save, Trash2 } from "lucide-react";
import { deleteReceiptAction, reviewReceiptAction } from "../app/actions/receipt-actions";
import { apiAssetUrl } from "../lib/api";
import { titleCase } from "../lib/format";
import { EXPENSE_CATEGORIES } from "../lib/options";
import { ConfirmForm } from "./confirm-form";
import { ExpenseSplitFields } from "./expense-split-fields";
import { PendingButton } from "./pending-button";

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
          <img src={imageUrl} alt={`收據 ${receipt.imageOriginalName || "預覽"}`} />
        ) : (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <ImageIcon size={24} /> 開啟收據文件
          </a>
        )}
        <span className="confidence">{Math.round(Number(receipt.confidenceScore) * 100)}% 辨識信心</span>
      </div>
      <div className="receipt-form">
        <div className="section-heading">
          <div><p className="eyebrow">待確認</p><h2>{receipt.imageOriginalName || "收據草稿"}</h2></div>
          <ConfirmForm
            action={deleteReceiptAction.bind(null, tripId, receipt.id)}
            message="要刪除這份收據草稿與上傳檔案嗎？"
          >
            <button className="icon-button danger" type="submit" title="刪除收據草稿"><Trash2 size={16} /></button>
          </ConfirmForm>
        </div>
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
            <span>付款人</span>
            <select name="payerMemberId" defaultValue={members[0]?.id} required>
              {members.map((member) => (
                <option value={member.id} key={member.id}>{member.displayName}</option>
              ))}
            </select>
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
          <ExpenseSplitFields members={members} />
          <div className="form-actions field-span-2">
            <PendingButton className="button button-secondary" name="intent" value="save" type="submit" pendingLabel="儲存中…">
              <Save size={16} /> 儲存草稿
            </PendingButton>
            <PendingButton className="button button-primary" name="intent" value="confirm" type="submit" pendingLabel="建立中…">
              <CheckCircle2 size={17} /> 確認並建立支出
            </PendingButton>
          </div>
        </form>
      </div>
    </article>
  );
}
