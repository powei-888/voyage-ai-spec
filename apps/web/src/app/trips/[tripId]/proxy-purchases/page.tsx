import type { ProxyPurchase, Trip, TripMember } from "@voyage/shared";
import {
  CheckCircle2,
  CircleDollarSign,
  HandCoins,
  PackageCheck,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2
} from "lucide-react";
import {
  cancelProxyPurchaseAction,
  collectProxyPurchaseAction,
  confirmProxyPurchaseAction,
  createProxyPurchaseAction,
  deleteProxyCollectionAction,
  updateProxyPurchaseAction
} from "../../../actions/proxy-purchase-actions";
import { ConfirmForm } from "../../../../components/confirm-form";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { PendingButton } from "../../../../components/pending-button";
import { ProxyPurchaseForm } from "../../../../components/proxy-purchase-form";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatMoney } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

const statusLabels: Record<ProxyPurchase["status"], string> = {
  requested: "待購買",
  purchased: "待收款",
  settled: "已結清",
  cancelled: "已取消"
};

export default async function ProxyPurchasesPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [trip, members, purchases] = await Promise.all([
    apiGet<Trip>(`/trips/${tripId}`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`),
    apiGet<ProxyPurchase[]>(`/trips/${tripId}/proxy-purchases`)
  ]);
  const externalMembers = members.filter((member) => member.kind === "external");
  const travelers = members.filter((member) => member.kind === "traveler");
  const today = new Date().toISOString().slice(0, 10);
  const activePurchases = purchases.filter((purchase) => purchase.status !== "cancelled");
  const pendingItemCount = activePurchases
    .filter((purchase) => purchase.status === "requested")
    .reduce((sum, purchase) => sum + purchase.items.length, 0);
  const purchasedTotal = activePurchases
    .filter((purchase) => purchase.status !== "requested")
    .reduce((sum, purchase) => sum + Number(purchase.totalAmount), 0);
  const outstandingTotal = activePurchases.reduce(
    (sum, purchase) => sum + Number(purchase.outstandingAmount),
    0
  );
  const grouped = new Map<string, ProxyPurchase[]>();
  for (const purchase of purchases) {
    const group = grouped.get(purchase.externalMemberId) ?? [];
    group.push(purchase);
    grouped.set(purchase.externalMemberId, group);
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="代購管理"
        title="代購對象與商品"
        description="依對象管理代購清單、墊付款與實際收款。"
        actions={<a className="button button-primary" href="#new-proxy-purchase"><Plus size={17} /> 新增代購單</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="proxy-overview" aria-label="代購摘要">
        <div><PackageCheck size={18} /><span>待買商品</span><strong>{pendingItemCount} 項</strong></div>
        <div><ShoppingBag size={18} /><span>已墊付</span><strong>{formatMoney(purchasedTotal, trip.baseCurrency)}</strong></div>
        <div><CircleDollarSign size={18} /><span>尚待收回</span><strong>{formatMoney(outstandingTotal, trip.baseCurrency)}</strong></div>
      </section>

      {purchases.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="尚無代購清單" body="建立對象並加入第一項代購商品。" />
      ) : (
        <div className="proxy-party-list">
          {[...grouped.entries()].map(([memberId, memberPurchases]) => {
            const member = memberPurchases[0]!.externalMember;
            const memberOutstanding = memberPurchases.reduce(
              (sum, purchase) => sum + Number(purchase.outstandingAmount),
              0
            );
            return (
              <section className="proxy-party-section" key={memberId}>
                <div className="proxy-party-heading">
                  <span className="member-avatar member-avatar-large">{member.displayName.slice(0, 2)}</span>
                  <div><h2>{member.displayName}</h2><span>{memberPurchases.length} 張代購單</span></div>
                  <strong>{memberOutstanding > 0 ? `待收 ${formatMoney(memberOutstanding, trip.baseCurrency)}` : "帳款已整理"}</strong>
                </div>
                <div className="proxy-order-list">
                  {memberPurchases.map((purchase) => (
                    <article className={`proxy-order proxy-order-${purchase.status}`} key={purchase.id}>
                      <div className="proxy-order-heading">
                        <div>
                          <span className={`proxy-status proxy-status-${purchase.status}`}>{statusLabels[purchase.status]}</span>
                          <h3>{purchase.items[0]?.description || "代購單"}{purchase.items.length > 1 ? ` 等 ${purchase.items.length} 項` : ""}</h3>
                          <p>建立於 {formatDate(purchase.createdAt)}</p>
                        </div>
                        <strong>{formatMoney(purchase.totalAmount, purchase.currency)}</strong>
                      </div>

                      <div className="proxy-item-list">
                        <div className="proxy-item-labels"><span>商品</span><span>數量</span><span>單價</span><span>小計</span></div>
                        {purchase.items.map((item) => (
                          <div className="proxy-item-row" key={item.id}>
                            <span><strong>{item.description}</strong>{item.note ? <small>{item.note}</small> : null}</span>
                            <span>{item.quantity}</span>
                            <span>{formatMoney(item.unitPrice, purchase.currency)}</span>
                            <b>{formatMoney(item.amount, purchase.currency)}</b>
                          </div>
                        ))}
                      </div>

                      {purchase.note ? <p className="proxy-order-note">{purchase.note}</p> : null}

                      {purchase.status === "requested" ? (
                        <div className="proxy-order-actions">
                          <details className="edit-drawer proxy-edit-drawer">
                            <summary><Pencil size={14} /> 編輯清單</summary>
                            <ProxyPurchaseForm
                              action={updateProxyPurchaseAction.bind(null, tripId, purchase.id)}
                              trip={trip}
                              externalMembers={externalMembers}
                              travelers={travelers}
                              today={today}
                              purchase={purchase}
                              submitLabel="儲存清單"
                            />
                          </details>
                          <form action={confirmProxyPurchaseAction.bind(null, tripId, purchase.id)} className="proxy-confirm-form">
                            <label className="field"><span>墊付旅伴</span><select name="payerMemberId" defaultValue={travelers[0]?.id} required>{travelers.map((member) => <option value={member.id} key={member.id}>{member.displayName}</option>)}</select></label>
                            <label className="field"><span>購買日期</span><input name="purchasedAt" type="date" defaultValue={today} required /></label>
                            <PendingButton className="button button-primary" type="submit" pendingLabel="入帳中…"><ShoppingBag size={15} /> 確認已購買</PendingButton>
                          </form>
                        </div>
                      ) : null}

                      {purchase.status === "purchased" ? (
                        <div className="proxy-collection-panel">
                          <div className="proxy-collection-progress">
                            <span>墊付人：{purchase.payerMember?.displayName} · {purchase.purchasedAt ? formatDate(purchase.purchasedAt) : ""}</span>
                            <span>已收 {formatMoney(purchase.collectedAmount, purchase.currency)}</span>
                            <strong>待收 {formatMoney(purchase.outstandingAmount, purchase.currency)}</strong>
                          </div>
                          <form action={collectProxyPurchaseAction.bind(null, tripId, purchase.id)} className="proxy-collect-form">
                            <input type="hidden" name="fromMemberId" value={purchase.externalMemberId} />
                            <input type="hidden" name="toMemberId" value={purchase.payerMemberId || ""} />
                            <input type="hidden" name="currency" value={purchase.currency} />
                            <label className="field"><span>本次收款</span><input name="amount" inputMode="decimal" defaultValue={purchase.outstandingAmount} required /></label>
                            <label className="field"><span>收款日期</span><input name="settledAt" type="date" defaultValue={today} required /></label>
                            <label className="field"><span>備註（選填）</span><input name="note" placeholder="現金、轉帳" maxLength={240} /></label>
                            <PendingButton className="button button-primary" type="submit" pendingLabel="記錄中…"><HandCoins size={15} /> 記錄收款</PendingButton>
                          </form>
                        </div>
                      ) : null}

                      {purchase.status === "settled" ? (
                        <div className="proxy-settled"><CheckCircle2 size={18} /><span>這張代購單已全部收回</span></div>
                      ) : null}

                      {purchase.settlements.length > 0 ? (
                        <div className="proxy-collection-history">
                          {purchase.settlements.map((settlement) => (
                            <div key={settlement.id}>
                              <span>{formatDate(settlement.settledAt)}</span>
                              <strong>{formatMoney(settlement.amount, purchase.currency)}</strong>
                              <ConfirmForm action={deleteProxyCollectionAction.bind(null, tripId, settlement.id)} message="要刪除這筆代購收款嗎？待收金額將重新計算。">
                                <button className="icon-button danger" type="submit" title="刪除收款紀錄"><Trash2 size={14} /></button>
                              </ConfirmForm>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {purchase.canCancel ? (
                        <ConfirmForm action={cancelProxyPurchaseAction.bind(null, tripId, purchase.id)} message={purchase.status === "requested" ? "要取消這張代購清單嗎？" : "要取消代購並作廢對應支出嗎？"} className="proxy-cancel-form">
                          <button className="button button-ghost danger" type="submit"><Trash2 size={14} /> 取消代購單</button>
                        </ConfirmForm>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="form-panel" id="new-proxy-purchase">
        <div className="section-heading"><div><p className="eyebrow">新增需求</p><h2>建立代購單</h2></div><ShoppingBag size={18} /></div>
        <ProxyPurchaseForm
          action={createProxyPurchaseAction.bind(null, tripId)}
          trip={trip}
          externalMembers={externalMembers}
          travelers={travelers}
          today={today}
          submitLabel="建立代購單"
        />
      </section>
    </div>
  );
}
