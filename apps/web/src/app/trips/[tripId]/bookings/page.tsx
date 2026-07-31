import type { Booking, ItineraryDay } from "@voyage/shared";
import { Link2, Pencil, Plus, TicketCheck, Trash2 } from "lucide-react";
import {
  createBookingAction,
  deleteBookingAction,
  updateBookingAction
} from "../../../actions/booking-actions";
import { BookingForm } from "../../../../components/booking-form";
import { ConfirmForm } from "../../../../components/confirm-form";
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
        eyebrow="預訂管理"
        title="預訂"
        description="集中管理確認碼、時間、附件與關聯行程。"
        actions={<a className="button button-primary" href="#add-booking"><Plus size={17} /> 新增預訂</a>}
      />
      <Notice error={query.error} notice={query.notice} />

      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">所有紀錄</p><h2>預訂清單</h2></div><span>{bookings.length}</span></div>
        {bookings.length === 0 ? (
          <EmptyState icon={TicketCheck} title="尚無預訂" body="新增航班、住宿、火車或活動預訂。" />
        ) : (
          <div className="booking-list">
            {bookings.map((booking) => (
              <article className="booking-row" key={booking.id}>
                <span className={`booking-symbol booking-${booking.type}`}>{titleCase(booking.type).slice(0, 1)}</span>
                <div className="booking-row-main">
                  <span className="category-label">{titleCase(booking.type)}</span>
                  <h3>{booking.title}</h3>
                  <p>{booking.provider || "未填供應商"} · {formatDateTime(booking.startTime)}</p>
                  <div className="inline-meta">
                    {booking.location ? <span>{booking.location}</span> : null}
                    {booking.linkedEvent ? <span><Link2 size={14} /> {booking.linkedEvent.title}</span> : null}
                  </div>
                  <details className="edit-drawer">
                    <summary><Pencil size={14} /> 編輯預訂</summary>
                    <BookingForm
                      action={updateBookingAction.bind(null, tripId, booking.id)}
                      events={events}
                      booking={booking}
                      submitLabel="儲存預訂"
                    />
                  </details>
                </div>
                <div className="booking-code">
                  <span>確認碼</span>
                  <code>{booking.confirmationCode || "未設定"}</code>
                </div>
                <ConfirmForm action={deleteBookingAction.bind(null, tripId, booking.id)} message="要刪除這筆預訂嗎？">
                  <button className="icon-button danger" type="submit" title="刪除預訂"><Trash2 size={16} /></button>
                </ConfirmForm>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="form-panel" id="add-booking">
        <div className="section-heading"><div><p className="eyebrow">手動新增</p><h2>新增預訂</h2></div></div>
        <BookingForm
          action={createBookingAction.bind(null, tripId)}
          events={events}
          submitLabel="新增預訂"
        />
      </section>
    </div>
  );
}
