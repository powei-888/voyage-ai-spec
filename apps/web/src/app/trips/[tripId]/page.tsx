import type { TripDashboard } from "@voyage/shared";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CreditCard,
  Landmark,
  MapPin,
  ReceiptText,
  TicketCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "../../../components/empty-state";
import { Notice } from "../../../components/notice";
import { PageHeading } from "../../../components/page-heading";
import { apiGet } from "../../../lib/api";
import { formatDateTime, formatMoney, formatTime, titleCase } from "../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function DashboardPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const dashboard = await apiGet<TripDashboard>(`/trips/${tripId}/dashboard`);
  const trip = dashboard.trip;

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="旅程總覽"
        title={trip.name}
        description={
          [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ") ||
          "尚未設定目的地"
        }
        actions={
          <Link className="button button-primary" href={`/trips/${tripId}/timeline`}>
            <CalendarClock size={17} /> 開啟行程表
          </Link>
        }
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="metric-grid" aria-label="旅程摘要">
        <article className="metric">
          <span><CreditCard size={17} /> 已記錄</span>
          <strong>{formatMoney(dashboard.recordedExpenseAmount, trip.baseCurrency)}</strong>
          <small>{trip.budgetAmount ? `預算 ${formatMoney(trip.budgetAmount, trip.baseCurrency)}` : "尚未設定預算"}</small>
        </article>
        <article className="metric">
          <span><Users size={17} /> 成員</span>
          <strong>{trip._count.members}</strong>
          <small>同行成員</small>
        </article>
        <article className="metric">
          <span><TicketCheck size={17} /> 預訂</span>
          <strong>{trip._count.bookings}</strong>
          <small>已儲存的預訂</small>
        </article>
        <article className="metric metric-attention">
          <span><ReceiptText size={17} /> 收據待確認</span>
          <strong>{dashboard.pendingReceipts}</strong>
          <small>等待人工確認</small>
        </article>
        <article className="metric">
          <span><Bot size={17} /> AI 提案</span>
          <strong>{dashboard.pendingProposals}</strong>
          <small>等待決策</small>
        </article>
        <article className="metric">
          <span><Landmark size={17} /> 公費餘額</span>
          <strong>{dashboard.publicFund ? formatMoney(dashboard.publicFund.balance, dashboard.publicFund.currency) : "尚未建立"}</strong>
          <small><Link href={`/trips/${tripId}/funds`}>管理公費</Link></small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="content-section dashboard-primary">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{dashboard.todayEvents.length > 0 ? "今天" : "下一個行程"}</p>
              <h2>{dashboard.todayEvents.length > 0 ? "行程表" : "即將到來的行程"}</h2>
            </div>
            <Link className="text-link" href={`/trips/${tripId}/timeline`}>
              查看全部 <ArrowRight size={15} />
            </Link>
          </div>
          {dashboard.todayEvents.length === 0 ? (
            dashboard.upcomingEvent ? (
              <article className="next-event">
                <span className="event-time">{formatDateTime(dashboard.upcomingEvent.startTime)}</span>
                <div>
                  <span className="category-label">{titleCase(dashboard.upcomingEvent.category)}</span>
                  <h3>{dashboard.upcomingEvent.title}</h3>
                  <p><MapPin size={15} /> {dashboard.upcomingEvent.locationName || "尚未設定地點"}</p>
                </div>
              </article>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="尚無行程安排"
                body="請從行程表新增第一個行程。"
              />
            )
          ) : (
            <div className="timeline-preview">
              {dashboard.todayEvents.map((event) => (
                <article key={event.id}>
                  <time>{formatTime(event.startTime)}</time>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.locationName || titleCase(event.category)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="content-section dashboard-side">
          <div className="section-heading">
            <div>
              <p className="eyebrow">即將到來</p>
              <h2>預訂</h2>
            </div>
            <TicketCheck size={18} />
          </div>
          {dashboard.upcomingBookings.length === 0 ? (
            <EmptyState
              icon={TicketCheck}
              title="沒有即將到來的預訂"
              body="新增航班、住宿或活動預訂。"
            />
          ) : (
            <div className="booking-preview-list">
              {dashboard.upcomingBookings.map((booking) => (
                <Link href={`/trips/${tripId}/bookings`} key={booking.id}>
                  <span className="booking-type-icon">{titleCase(booking.type).slice(0, 1)}</span>
                  <span>
                    <strong>{booking.title}</strong>
                    <small>{formatDateTime(booking.startTime)}</small>
                  </span>
                  {booking.confirmationCode ? <code>{booking.confirmationCode}</code> : null}
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
