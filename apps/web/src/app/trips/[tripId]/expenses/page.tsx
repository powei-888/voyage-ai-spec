import type {
  Expense,
  ExpenseBalances,
  ItineraryDay,
  Trip,
  TripMember
} from "@voyage/shared";
import { CreditCard, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import {
  createExpenseAction,
  updateExpenseAction,
  voidExpenseAction
} from "../../../actions/expense-actions";
import { EmptyState } from "../../../../components/empty-state";
import { ExpenseForm } from "../../../../components/expense-form";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney, titleCase } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function ExpensesPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [trip, members, expenses, balances, days] = await Promise.all([
    apiGet<Trip>(`/trips/${tripId}`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`),
    apiGet<Expense[]>(`/trips/${tripId}/expenses`),
    apiGet<ExpenseBalances>(`/trips/${tripId}/expenses/balances`),
    apiGet<ItineraryDay[]>(`/trips/${tripId}/itinerary-days`)
  ]);
  const events = days.flatMap((day) => day.events);
  const names = new Map(members.map((member) => [member.id, member.displayName]));
  const activeExpenses = expenses.filter((expense) => expense.status === "active");
  const total = activeExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="費用管理"
        title="支出"
        description="管理支出、平均分攤與成員結算。"
        actions={
          <a className="button button-primary" href="#add-expense"><Plus size={17} /> 新增支出</a>
        }
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="money-summary">
        <div className="money-total">
          <span>已記錄總額</span>
          <strong>{formatMoney(total, trip.baseCurrency)}</strong>
          <small>{activeExpenses.length} 筆有效支出</small>
        </div>
        <div className="balance-list">
          {balances.members.map((member) => {
            const numeric = Number(member.balance);
            return (
              <div key={member.memberId}>
                <span className="member-avatar">{member.displayName.slice(0, 2).toUpperCase()}</span>
                <span><strong>{member.displayName}</strong><small>已支付 {formatMoney(member.paidAmount, balances.currency)}</small></span>
                <b className={numeric > 0 ? "positive" : numeric < 0 ? "negative" : ""}>
                  {numeric > 0 ? "+" : ""}{formatMoney(member.balance, balances.currency)}
                </b>
              </div>
            );
          })}
        </div>
      </section>

      {balances.settlements.length > 0 ? (
        <section className="settlement-strip" aria-label="建議結算">
          <strong>建議結算</strong>
          {balances.settlements.map((settlement) => (
            <span key={`${settlement.fromMemberId}-${settlement.toMemberId}`}>
              {names.get(settlement.fromMemberId)} 支付給 {names.get(settlement.toMemberId)} {formatMoney(settlement.amount, balances.currency)}
            </span>
          ))}
        </section>
      ) : null}

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">支出帳本</p><h2>支出明細</h2></div></div>
        {expenses.length === 0 ? (
          <EmptyState icon={CreditCard} title="尚無支出" body="手動新增支出，或上傳收據建立紀錄。" />
        ) : (
          <div className="expense-list">
            {expenses.map((expense) => (
              <article className={`expense-row ${expense.status === "voided" ? "is-voided" : ""}`} key={expense.id}>
                <span className="expense-icon"><CreditCard size={17} /></span>
                <div className="expense-main">
                  <div>
                    <span className="category-label">{titleCase(expense.category)}</span>
                    <h3>{expense.title}</h3>
                    <p>{expense.merchant || "未填商家"} · 付款人：{expense.payerMember.displayName}</p>
                  </div>
                  <div className="expense-amount">
                    <strong>{formatMoney(expense.amount, expense.currency)}</strong>
                    <span>{expense.expenseDate ? formatDate(expense.expenseDate) : "未填日期"}</span>
                  </div>
                  {expense.status === "active" ? (
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
                  ) : <span className="status-pill">{titleCase(expense.status)}</span>}
                </div>
                {expense.status === "active" ? (
                  <form action={voidExpenseAction.bind(null, tripId, expense.id)}>
                    <button className="icon-button danger" type="submit" title="作廢支出"><Trash2 size={16} /></button>
                  </form>
                ) : null}
              </article>
            ))}
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
