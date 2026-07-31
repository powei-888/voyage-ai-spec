import type { Booking, ItineraryDay } from "@voyage/shared";
import { Link2, Pencil, Plus, TicketCheck, Trash2 } from "lucide-react";
import {
  createBookingAction,
  deleteBookingAction,
  updateBookingAction
} from "../../../actions/booking-actions";
import { BookingForm } from "../../../../components/booking-form";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { apiGet } from "../../../../lib/api";
import { formatDateTime, titleCase } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function BookingsPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [bookings, days] = await Promise.all([
    apiGet<Booking[]>(`/trips/${tripId}/bookings`),
    apiGet<ItineraryDay[]>(`/trips/${tripId}/itinerary-days`)
  ]);
  const events = days.flatMap((day) => day.events);

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Reservations"
        title="Booking hub"
        description="Codes, schedules, attachments, and itinerary links."
        actions={<a className="button button-primary" href="#add-booking"><Plus size={17} /> Add booking</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">All records</p><h2>Bookings</h2></div><span>{bookings.length}</span></div>
        {bookings.length === 0 ? (
          <EmptyState icon={TicketCheck} title="No bookings" body="Add a flight, hotel, train, or activity." />
        ) : (
          <div className="booking-list">
            {bookings.map((booking) => (
              <article className="booking-row" key={booking.id}>
                <span className={`booking-symbol booking-${booking.type}`}>{booking.type.slice(0, 1).toUpperCase()}</span>
                <div className="booking-row-main">
                  <span className="category-label">{titleCase(booking.type)}</span>
                  <h3>{booking.title}</h3>
                  <p>{booking.provider || "Provider open"} · {formatDateTime(booking.startTime)}</p>
                  <div className="inline-meta">
                    {booking.location ? <span>{booking.location}</span> : null}
                    {booking.linkedEvent ? <span><Link2 size={14} /> {booking.linkedEvent.title}</span> : null}
                  </div>
                  <details className="edit-drawer">
                    <summary><Pencil size={14} /> Edit booking</summary>
                    <BookingForm
                      action={updateBookingAction.bind(null, tripId, booking.id)}
                      events={events}
                      booking={booking}
                      submitLabel="Save booking"
                    />
                  </details>
                </div>
                <div className="booking-code">
                  <span>Confirmation</span>
                  <code>{booking.confirmationCode || "Not set"}</code>
                </div>
                <form action={deleteBookingAction.bind(null, tripId, booking.id)}>
                  <button className="icon-button danger" type="submit" title="Delete booking"><Trash2 size={16} /></button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="form-panel" id="add-booking">
        <div className="section-heading"><div><p className="eyebrow">Manual entry</p><h2>Add booking</h2></div></div>
        <BookingForm
          action={createBookingAction.bind(null, tripId)}
          events={events}
          submitLabel="Add booking"
        />
      </section>
    </div>
  );
}
