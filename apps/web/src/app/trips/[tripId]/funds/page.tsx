import type { ExpenseBalances, Trip, TripFund, TripMember } from "@voyage/shared";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Plus,
  ReceiptText,
  Scale,
  ShoppingBag,
  Trash2,
  Users
} from "lucide-react";
import {
  createFundAction,
  createFundTransactionAction,
  voidFundTransactionAction
} from "../../../actions/fund-actions";
import { ConfirmForm } from "../../../../components/confirm-form";
import { EmptyState } from "../../../../components/empty-state";
import { FundTransactionForm } from "../../../../components/fund-transaction-form";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { PendingButton } from "../../../../components/pending-button";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

const transactionLabels = {
  contribution: "旅伴繳交",
  refund: "退回旅伴",
  adjustment_credit: "餘額增加調整",
  adjustment_debit: "餘額減少調整",
  collection: "代購收款"
} as const;

export default async function FundsPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [trip, members, funds, balances] = await Promise.all([
    apiGet<Trip>(`/trips/${tripId}`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`),
    apiGet<TripFund[]>(`/trips/${tripId}/funds`),
    apiGet<ExpenseBalances>(`/trips/${tripId}/expenses/balances`)
  ]);
  const travelers = members.filter((member) => member.kind === "traveler");
  const names = new Map(members.map((member) => [member.id, member.displayName]));
  const today = new Date().toISOString().slice(0, 10);
  const fund = funds[0];
  const transfers = fund
    ? balances.fundTransfers.filter(
        (transfer) =>
          transfer.fundId === fund.id &&
          (transfer.type !== "refund" || trip.status === "archived")
      )
    : [];

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="共同資金"
        title="旅程公費"
        description="管理旅伴繳交、共同支出、退款與帳面調整。"
        actions={fund ? <a className="button button-primary" href="#record-fund"><Plus size={17} /> 新增流水</a> : undefined}
      />
      <Notice error={query.error} notice={query.notice} />

      {!fund ? (
        <section className="form-panel">
          <EmptyState icon={Landmark} title="尚未建立公費" body="建立旅程的共同資金帳戶。" />
          <form action={createFundAction.bind(null, tripId)} className="form-grid fund-create-form">
            <label className="field field-span-2">
              <span>帳戶名稱</span>
              <input name="name" defaultValue="旅程公費" required maxLength={80} />
            </label>
            <input type="hidden" name="currency" value={trip.baseCurrency} />
            <div className="form-actions field-span-2">
              <PendingButton className="button button-primary" type="submit" pendingLabel="建立中…">
                <Landmark size={16} /> 建立公費帳戶
              </PendingButton>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="fund-balance-band">
            <div className="fund-current-balance">
              <span><Landmark size={17} /> {fund.name}</span>
              <strong>{formatMoney(fund.balance, fund.currency)}</strong>
              <small>目前可用餘額</small>
            </div>
            <div className="fund-stats">
              <div><ArrowDownToLine size={17} /><span>旅伴繳交</span><strong>{formatMoney(fund.totals.contributions, fund.currency)}</strong></div>
              <div><ReceiptText size={17} /><span>公費支出</span><strong>{formatMoney(fund.totals.expenses, fund.currency)}</strong></div>
              <div><ArrowUpFromLine size={17} /><span>已退款</span><strong>{formatMoney(fund.totals.refunds, fund.currency)}</strong></div>
              <div><ShoppingBag size={17} /><span>代購收回</span><strong>{formatMoney(fund.totals.collections, fund.currency)}</strong></div>
            </div>
          </section>

          {transfers.length > 0 ? (
            <section className="content-section">
              <div className="section-heading"><div><p className="eyebrow">帳務建議</p><h2>待處理公費</h2></div><Scale size={18} /></div>
              <div className="fund-transfer-list">
                {transfers.map((transfer) => (
                  <form
                    action={createFundTransactionAction.bind(null, tripId, fund.id)}
                    className="fund-transfer-row"
                    key={`${transfer.type}-${transfer.memberId}`}
                  >
                    <input type="hidden" name="type" value={transfer.type} />
                    <input type="hidden" name="memberId" value={transfer.memberId} />
                    <input type="hidden" name="amount" value={transfer.amount} />
                    <input type="hidden" name="transactionDate" value={today} />
                    <span>
                      <strong>{names.get(transfer.memberId)}</strong>
                      <small>{transfer.type === "refund" ? "由公費退回" : transfer.type === "collection" ? "外部款項繳回公費" : "補繳至公費"}</small>
                    </span>
                    <b>{formatMoney(transfer.amount, fund.currency)}</b>
                    <PendingButton className="button button-secondary button-compact" type="submit" pendingLabel="記錄中…">
                      {transfer.type === "refund" ? <ArrowUpFromLine size={15} /> : <ArrowDownToLine size={15} />}
                      記錄
                    </PendingButton>
                  </form>
                ))}
              </div>
            </section>
          ) : null}

          <section className="content-section">
            <div className="section-heading"><div><p className="eyebrow">成員資金</p><h2>淨投入</h2></div><Users size={18} /></div>
            {fund.memberPositions.filter((position) => position.member.kind === "traveler").length === 0 ? (
              <EmptyState icon={Users} title="尚無旅伴流水" body="記錄第一筆公費繳交後會顯示在這裡。" />
            ) : (
              <div className="fund-member-list">
                {fund.memberPositions.filter((position) => position.member.kind === "traveler").map((position) => (
                  <div key={position.member.id}>
                    <span className="member-avatar">{position.member.displayName.slice(0, 2)}</span>
                    <span><strong>{position.member.displayName}</strong><small>繳交 {formatMoney(position.contributedAmount, fund.currency)} · 退回 {formatMoney(position.refundedAmount, fund.currency)}</small></span>
                    <b>{formatMoney(position.netAmount, fund.currency)}</b>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="content-section">
            <div className="section-heading"><div><p className="eyebrow">稽核軌跡</p><h2>公費帳本</h2></div></div>
            {fund.ledger.length === 0 ? (
              <EmptyState icon={ReceiptText} title="尚無公費流水" body="繳交、支出與退款都會依時間列在這裡。" />
            ) : (
              <div className="fund-ledger">
                {fund.ledger.map((entry) => {
                  const isExpense = entry.kind === "expense";
                  const label = isExpense ? entry.title : transactionLabels[entry.type];
                  const detail = isExpense
                    ? entry.note || "公費支付"
                    : [entry.member?.displayName, entry.note].filter(Boolean).join(" · ") || "公費調整";
                  return (
                    <article className={entry.status === "voided" ? "is-voided" : ""} key={`${entry.kind}-${entry.id}`}>
                      <span className={`fund-ledger-icon direction-${entry.direction}`}>
                        {entry.direction === "in" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                      </span>
                      <div><strong>{label}</strong><small>{formatDate(entry.occurredAt)} · {detail}</small></div>
                      <b className={entry.direction === "in" ? "positive" : "negative"}>{entry.direction === "in" ? "+" : "-"}{formatMoney(entry.amount, fund.currency)}</b>
                      {!isExpense && entry.status === "active" ? (
                        <ConfirmForm action={voidFundTransactionAction.bind(null, tripId, fund.id, entry.id)} message="要作廢這筆公費流水嗎？餘額與分帳會重新計算。">
                          <input type="hidden" name="reason" value="使用者於公費帳本作廢" />
                          <button className="icon-button danger" type="submit" title="作廢公費流水"><Trash2 size={15} /></button>
                        </ConfirmForm>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="form-panel" id="record-fund">
            <div className="section-heading"><div><p className="eyebrow">新增紀錄</p><h2>公費流水</h2></div><Landmark size={18} /></div>
            <FundTransactionForm
              action={createFundTransactionAction.bind(null, tripId, fund.id)}
              travelers={travelers}
              currency={fund.currency}
              today={today}
            />
          </section>
        </>
      )}
    </div>
  );
}
