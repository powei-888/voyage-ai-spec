import type { TripDashboard } from "@voyage/shared";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CreditCard,
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
        eyebrow="Trip overview"
        title={trip.name}
        description={
          [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ") ||
          "Destination open"
        }
        actions={
          <Link className="button button-primary" href={`/trips/${tripId}/timeline`}>
            <CalendarClock size={17} /> Open timeline
          </Link>
        }
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="metric-grid" aria-label="Trip summary">
        <article className="metric">
          <span><CreditCard size={17} /> Recorded</span>
          <strong>{formatMoney(dashboard.recordedExpenseAmount, trip.baseCurrency)}</strong>
          <small>{trip.budgetAmount ? `${formatMoney(trip.budgetAmount, trip.baseCurrency)} budget` : "No budget set"}</small>
        </article>
        <article className="metric">
          <span><Users size={17} /> Members</span>
          <strong>{trip._count.members}</strong>
          <small>Traveling together</small>
        </article>
        <article className="metric">
          <span><TicketCheck size={17} /> Bookings</span>
          <strong>{trip._count.bookings}</strong>
          <small>Saved reservations</small>
        </article>
        <article className="metric metric-attention">
          <span><ReceiptText size={17} /> Receipt review</span>
          <strong>{dashboard.pendingReceipts}</strong>
          <small>Waiting for confirmation</small>
        </article>
        <article className="metric">
          <span><Bot size={17} /> AI proposals</span>
          <strong>{dashboard.pendingProposals}</strong>
          <small>Pending decisions</small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="content-section dashboard-primary">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{dashboard.todayEvents.length > 0 ? "Today" : "Next up"}</p>
              <h2>{dashboard.todayEvents.length > 0 ? "Timeline" : "Upcoming event"}</h2>
            </div>
            <Link className="text-link" href={`/trips/${tripId}/timeline`}>
              View all <ArrowRight size={15} />
            </Link>
          </div>
          {dashboard.todayEvents.length === 0 ? (
            dashboard.upcomingEvent ? (
              <article className="next-event">
                <span className="event-time">{formatDateTime(dashboard.upcomingEvent.startTime)}</span>
                <div>
                  <span className="category-label">{titleCase(dashboard.upcomingEvent.category)}</span>
                  <h3>{dashboard.upcomingEvent.title}</h3>
                  <p><MapPin size={15} /> {dashboard.upcomingEvent.locationName || "Location open"}</p>
                </div>
              </article>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Nothing scheduled"
                body="Add the first event from the timeline."
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
              <p className="eyebrow">Upcoming</p>
              <h2>Bookings</h2>
            </div>
            <TicketCheck size={18} />
          </div>
          {dashboard.upcomingBookings.length === 0 ? (
            <EmptyState
              icon={TicketCheck}
              title="No upcoming bookings"
              body="Add a flight, hotel, or activity booking."
            />
          ) : (
            <div className="booking-preview-list">
              {dashboard.upcomingBookings.map((booking) => (
                <Link href={`/trips/${tripId}/bookings`} key={booking.id}>
                  <span className="booking-type-icon">{booking.type.slice(0, 1).toUpperCase()}</span>
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
