import type {
  Expense,
  ExpenseBalances,
  ItineraryDay,
  ProxyPurchase,
  Settlement,
  Trip,
  TripMember
} from "@voyage/shared";
import {
  CheckCircle2,
  CreditCard,
  HandCoins,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2
} from "lucide-react";
import {
  createExpenseAction,
  updateExpenseAction,
  voidExpenseAction
} from "../../../actions/expense-actions";
import {
  createSettlementAction,
  deleteSettlementAction
} from "../../../actions/settlement-actions";
import { ConfirmForm } from "../../../../components/confirm-form";
import { EmptyState } from "../../../../components/empty-state";
import { ExpenseForm } from "../../../../components/expense-form";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { PendingButton } from "../../../../components/pending-button";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney, titleCase } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function ExpensesPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [trip, members, expenses, balances, days, settlements, proxyPurchases] = await Promise.all([
    apiGet<Trip>(`/trips/${tripId}`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`),
    apiGet<Expense[]>(`/trips/${tripId}/expenses`),
    apiGet<ExpenseBalances>(`/trips/${tripId}/expenses/balances`),
    apiGet<ItineraryDay[]>(`/trips/${tripId}/itinerary-days`),
    apiGet<Settlement[]>(`/trips/${tripId}/settlements`),
    apiGet<ProxyPurchase[]>(`/trips/${tripId}/proxy-purchases`)
  ]);
  const events = days.flatMap((day) => day.events);
  const names = new Map(members.map((member) => [member.id, member.displayName]));
  const memberKinds = new Map(members.map((member) => [member.id, member.kind]));
  const activeExpenses = expenses.filter((expense) => expense.status === "active");
  const total = activeExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const externalReceivableTotal = balances.externalReceivables.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const today = new Date().toISOString().slice(0, 10);
  const openProxyMembers = new Set(
    proxyPurchases
      .filter((purchase) => purchase.status === "purchased")
      .map((purchase) => purchase.externalMemberId)
  );

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="費用管理"
        title="支出與結算"
        description="管理支出、分攤方式與實際還款紀錄。"
        actions={
          <a className="button button-primary" href="#add-expense"><Plus size={17} /> 新增支出</a>
        }
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="money-summary">
        <div className="money-total">
          <span>已記錄付款總額</span>
          <strong>{formatMoney(total, trip.baseCurrency)}</strong>
          <small>
            {activeExpenses.length} 筆有效支出 · {settlements.length} 筆還款
            {externalReceivableTotal > 0
              ? ` · 外部應收 ${formatMoney(externalReceivableTotal, trip.baseCurrency)}`
              : ""}
          </small>
        </div>
        <div className="balance-list">
          {balances.members.map((member) => {
            const numeric = Number(member.balance);
            return (
              <div key={member.memberId}>
                <span className="member-avatar">{member.displayName.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{member.displayName}</strong>
                  <small>
                    {member.kind === "external" ? "外部代購對象" : "旅伴"}
                    {" · "}已支付 {formatMoney(member.paidAmount, balances.currency)}
                  </small>
                </span>
                <b className={numeric > 0 ? "positive" : numeric < 0 ? "negative" : ""}>
                  {numeric > 0 ? "+" : ""}{formatMoney(member.balance, balances.currency)}
                </b>
              </div>
            );
          })}
        </div>
      </section>

      {balances.externalReceivables.length > 0 ? (
        <section className="content-section">
          <div className="section-heading">
            <div><p className="eyebrow">代購帳款</p><h2>外部應收</h2></div>
            <ShoppingBag size={18} />
          </div>
          <div className="simple-list">
            {balances.externalReceivables.map((item) => (
              <article key={item.memberId}>
                <span className="state-dot state-processing" />
                <div><strong>{item.displayName}</strong><small>尚未收回</small></div>
                <b>{formatMoney(item.amount, balances.currency)}</b>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">下一步</p><h2>建議還款</h2></div>
          <HandCoins size={18} />
        </div>
        {balances.settlements.length === 0 ? (
          <div className="settled-state"><CheckCircle2 size={20} /><span>目前帳目已結清</span></div>
        ) : (
          <div className="settlement-list">
            {balances.settlements.map((settlement) => (
              <form
                action={createSettlementAction.bind(null, tripId)}
                className="settlement-row"
                key={`${settlement.fromMemberId}-${settlement.toMemberId}`}
              >
                <input type="hidden" name="fromMemberId" value={settlement.fromMemberId} />
                <input type="hidden" name="toMemberId" value={settlement.toMemberId} />
                <input type="hidden" name="amount" value={settlement.amount} />
                <input type="hidden" name="currency" value={balances.currency} />
                <input type="hidden" name="settledAt" value={today} />
                <span>
                  <strong>{names.get(settlement.fromMemberId)}</strong>
                  支付給 <strong>{names.get(settlement.toMemberId)}</strong>
                </span>
                <b>{formatMoney(settlement.amount, balances.currency)}</b>
                {openProxyMembers.has(settlement.fromMemberId) ? (
                  <a className="button button-secondary button-compact" href={`/trips/${tripId}/proxy-purchases`}>
                    <ShoppingBag size={15} /> 管理代購收款
                  </a>
                ) : (
                  <PendingButton className="button button-secondary button-compact" type="submit" pendingLabel="記錄中…">
                    <CheckCircle2 size={15} /> 標記已付款
                  </PendingButton>
                )}
              </form>
            ))}
          </div>
        )}
      </section>

      {settlements.length > 0 ? (
        <section className="content-section">
          <div className="section-heading"><div><p className="eyebrow">付款軌跡</p><h2>還款紀錄</h2></div></div>
          <div className="simple-list">
            {settlements.map((settlement) => (
              <article key={settlement.id}>
                <span className="state-dot state-accepted" />
                <div>
                  <strong>{settlement.fromMember.displayName} → {settlement.toMember.displayName}</strong>
                  <small>{formatDate(settlement.settledAt)}{settlement.note ? ` · ${settlement.note}` : ""}</small>
                </div>
                <b>{formatMoney(settlement.amount, settlement.currency)}</b>
                <ConfirmForm
                  action={deleteSettlementAction.bind(null, tripId, settlement.id)}
                  message="要刪除這筆還款紀錄嗎？餘額將重新計算。"
                >
                  <button className="icon-button danger" type="submit" title="刪除還款紀錄"><Trash2 size={15} /></button>
                </ConfirmForm>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">支出帳本</p><h2>支出明細</h2></div></div>
        {expenses.length === 0 ? (
          <EmptyState icon={CreditCard} title="尚無支出" body="手動新增支出，或上傳收據建立紀錄。" />
        ) : (
          <div className="expense-list">
            {expenses.map((expense) => {
              const externalShares = expense.participants.filter(
                (participant) => memberKinds.get(participant.memberId) === "external"
              );
              return (
              <article className={`expense-row ${expense.status === "voided" ? "is-voided" : ""}`} key={expense.id}>
                <span className="expense-icon"><CreditCard size={17} /></span>
                <div className="expense-main">
                  <div>
                    <span className="category-label">{titleCase(expense.category)} · {expense.splitMethod === "custom" ? "自訂分攤" : "平均分攤"}</span>
                    <h3>{expense.title}</h3>
                    <p>{expense.merchant || "未填商家"} · 付款人：{expense.payerMember.displayName}</p>
                    {externalShares.length > 0 ? (
                      <p className="proxy-share-summary">
                        <ShoppingBag size={13} />
                        {externalShares.map((share) =>
                          `${share.member.displayName} ${formatMoney(share.shareAmount, expense.currency)}`
                        ).join("、")}
                      </p>
                    ) : null}
                  </div>
                  <div className="expense-amount">
                    <strong>{formatMoney(expense.amount, expense.currency)}</strong>
                    <span>{expense.expenseDate ? formatDate(expense.expenseDate) : "未填日期"}</span>
                  </div>
                  {expense.status === "active" && !expense.proxyPurchase ? (
                    <details className="edit-drawer expense-edit">
                      <summary><Pencil size={14} /> 編輯</summary>
                      <ExpenseForm
                        action={updateExpenseAction.bind(null, tripId, expense.id)}
                        trip={trip}
                        members={members}
                        events={events}
                        expense={expense}
                        submitLabel="儲存支出"
                      />
                    </details>
                  ) : expense.proxyPurchase ? (
                    <a className="text-link" href={`/trips/${tripId}/proxy-purchases`}><ShoppingBag size={14} /> 由代購單管理</a>
                  ) : <span className="status-pill">{titleCase(expense.status)}</span>}
                </div>
                {expense.status === "active" && !expense.proxyPurchase ? (
                  <ConfirmForm
                    action={voidExpenseAction.bind(null, tripId, expense.id)}
                    message="要作廢這筆支出嗎？它將不再計入餘額。"
                  >
                    <button className="icon-button danger" type="submit" title="作廢支出"><Trash2 size={16} /></button>
                  </ConfirmForm>
                ) : null}
              </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="form-panel" id="add-expense">
        <div className="section-heading">
          <div><p className="eyebrow">快速新增</p><h2>新增支出</h2></div>
          <a className="text-link" href={`/trips/${tripId}/receipts`}><ReceiptText size={15} /> 上傳收據</a>
        </div>
        <ExpenseForm
          action={createExpenseAction.bind(null, tripId)}
          trip={trip}
          members={members}
          events={events}
          submitLabel="新增支出"
        />
      </section>
    </div>
  );
}
