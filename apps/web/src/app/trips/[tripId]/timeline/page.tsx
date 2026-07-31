import type { ItineraryDay, Trip, TripMember } from "@voyage/shared";
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Clock3,
  Link2,
  MapPin,
  Pencil,
  Trash2
} from "lucide-react";
import Link from "next/link";
import {
  createEventAction,
  deleteEventAction,
  reorderEventsAction,
  updateEventAction
} from "../../../actions/itinerary-actions";
import { EmptyState } from "../../../../components/empty-state";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { apiGet } from "../../../../lib/api";
import { formatDate, formatTime, titleCase, toDateTimeInput } from "../../../../lib/format";
import { EVENT_CATEGORIES } from "../../../../lib/options";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ day?: string; error?: string; notice?: string }>;
};

function moveEvent(ids: string[], index: number, offset: -1 | 1): string[] {
  const target = index + offset;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  const current = next[index]!;
  next[index] = next[target]!;
  next[target] = current;
  return next;
}

export default async function TimelinePage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const [trip, days, members] = await Promise.all([
    apiGet<Trip>(`/trips/${tripId}`),
    apiGet<ItineraryDay[]>(`/trips/${tripId}/itinerary-days`),
    apiGet<TripMember[]>(`/trips/${tripId}/members`)
  ]);
  const selectedDay = days.find((day) => day.id === query.day) || days[0];
  const orderedIds = selectedDay?.events.map((event) => event.id) || [];

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Plan"
        title="Timeline"
        description="Day-by-day itinerary and shared context."
        actions={
          selectedDay ? (
            <a className="button button-primary" href="#add-event">
              <CalendarPlus size={17} /> Add event
            </a>
          ) : null
        }
      />
      <Notice error={query.error} notice={query.notice} />

      <nav className="day-tabs" aria-label="Itinerary days">
        {days.map((day) => (
          <Link
            className={selectedDay?.id === day.id ? "active" : ""}
            href={`/trips/${tripId}/timeline?day=${day.id}`}
            key={day.id}
          >
            <strong>Day {day.dayIndex}</strong>
            <span>{formatDate(day.date, { month: "short", day: "numeric" })}</span>
          </Link>
        ))}
      </nav>

      {!selectedDay ? (
        <EmptyState
          icon={CalendarPlus}
          title="No itinerary days"
          body="Check the trip date range in settings."
        />
      ) : (
        <>
          <section className="content-section">
            <div className="section-heading day-heading">
              <div>
                <p className="eyebrow">Day {selectedDay.dayIndex}</p>
                <h2>{selectedDay.title || formatDate(selectedDay.date)}</h2>
              </div>
              <span>{selectedDay.events.length} events</span>
            </div>

            {selectedDay.events.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title="This day is open"
                body="Add an event with a title now; time and location can come later."
              />
            ) : (
              <div className="event-list">
                {selectedDay.events.map((event, index) => (
                  <article className="event-row" key={event.id}>
                    <div className="event-row-time">
                      <strong>{formatTime(event.startTime)}</strong>
                      <span>{event.endTime ? formatTime(event.endTime) : ""}</span>
                    </div>
                    <span className={`event-category category-${event.category}`} aria-hidden="true" />
                    <div className="event-row-main">
                      <span className="category-label">{titleCase(event.category)}</span>
                      <h3>{event.title}</h3>
                      <div className="inline-meta">
                        {event.locationName ? <span><MapPin size={14} /> {event.locationName}</span> : null}
                        {event._count.bookings + event._count.expenses > 0 ? (
                          <span><Link2 size={14} /> {event._count.bookings + event._count.expenses} linked</span>
                        ) : null}
                      </div>
                      {event.notes ? <p>{event.notes}</p> : null}
                      <details className="edit-drawer">
                        <summary><Pencil size={14} /> Edit event</summary>
                        <form
                          action={updateEventAction.bind(null, tripId, selectedDay.id, event.id)}
                          className="form-grid compact-form"
                        >
                          <label className="field field-span-2">
                            <span>Title</span>
                            <input name="title" defaultValue={event.title} required />
                          </label>
                          <label className="field">
                            <span>Category</span>
                            <select name="category" defaultValue={event.category}>
                              {EVENT_CATEGORIES.map((category) => (
                                <option value={category} key={category}>{titleCase(category)}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Location</span>
                            <input name="locationName" defaultValue={event.locationName || ""} />
                          </label>
                          <label className="field field-span-2">
                            <span>Address</span>
                            <input name="address" defaultValue={event.address || ""} />
                          </label>
                          <label className="field">
                            <span>Starts</span>
                            <input name="startTime" type="datetime-local" defaultValue={toDateTimeInput(event.startTime)} />
                          </label>
                          <label className="field">
                            <span>Ends</span>
                            <input name="endTime" type="datetime-local" defaultValue={toDateTimeInput(event.endTime)} />
                          </label>
                          <label className="field">
                            <span>Estimated cost</span>
                            <input name="estimatedCostAmount" inputMode="decimal" defaultValue={event.estimatedCostAmount || ""} />
                          </label>
                          <label className="field">
                            <span>Cost currency</span>
                            <select name="estimatedCostCurrency" defaultValue={event.estimatedCostCurrency || trip.baseCurrency}>
                              <option value={trip.baseCurrency}>{trip.baseCurrency}</option>
                              <option value="USD">USD</option><option value="JPY">JPY</option>
                              <option value="TWD">TWD</option><option value="EUR">EUR</option>
                            </select>
                          </label>
                          <label className="field field-span-2">
                            <span>Notes</span>
                            <textarea name="notes" rows={2} defaultValue={event.notes || ""} />
                          </label>
                          <fieldset className="check-group field-span-2">
                            <legend>Participants</legend>
                            {members.map((member) => (
                              <label key={member.id}>
                                <input
                                  type="checkbox"
                                  name="participantMemberIds"
                                  value={member.id}
                                  defaultChecked={event.participants.some((item) => item.memberId === member.id)}
                                />
                                <span>{member.displayName}</span>
                              </label>
                            ))}
                          </fieldset>
                          <div className="form-actions field-span-2">
                            <button className="button button-secondary" type="submit">Save changes</button>
                          </div>
                        </form>
                      </details>
                    </div>
                    <div className="event-row-actions">
                      <form action={reorderEventsAction.bind(null, tripId, selectedDay.id, moveEvent(orderedIds, index, -1))}>
                        <button className="icon-button" type="submit" title="Move event up" disabled={index === 0}>
                          <ArrowUp size={16} />
                        </button>
                      </form>
                      <form action={reorderEventsAction.bind(null, tripId, selectedDay.id, moveEvent(orderedIds, index, 1))}>
                        <button className="icon-button" type="submit" title="Move event down" disabled={index === orderedIds.length - 1}>
                          <ArrowDown size={16} />
                        </button>
                      </form>
                      <form action={deleteEventAction.bind(null, tripId, selectedDay.id, event.id)}>
                        <button className="icon-button danger" type="submit" title="Delete event">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="form-panel" id="add-event">
            <div className="section-heading">
              <div><p className="eyebrow">Day {selectedDay.dayIndex}</p><h2>Add event</h2></div>
            </div>
            <form action={createEventAction.bind(null, tripId, selectedDay.id)} className="form-grid">
              <label className="field field-span-2">
                <span>Title</span>
                <input name="title" placeholder="Senso-ji morning walk" required />
              </label>
              <label className="field">
                <span>Category</span>
                <select name="category" defaultValue="attraction">
                  {EVENT_CATEGORIES.map((category) => (
                    <option value={category} key={category}>{titleCase(category)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Location</span>
                <input name="locationName" placeholder="Asakusa" />
              </label>
              <label className="field field-span-2">
                <span>Address</span>
                <input name="address" placeholder="2 Chome-3-1 Asakusa, Tokyo" />
              </label>
              <label className="field"><span>Starts</span><input name="startTime" type="datetime-local" /></label>
              <label className="field"><span>Ends</span><input name="endTime" type="datetime-local" /></label>
              <label className="field">
                <span>Estimated cost</span>
                <input name="estimatedCostAmount" inputMode="decimal" placeholder="0" />
              </label>
              <label className="field">
                <span>Cost currency</span>
                <select name="estimatedCostCurrency" defaultValue={trip.baseCurrency}>
                  <option value={trip.baseCurrency}>{trip.baseCurrency}</option>
                  <option value="USD">USD</option><option value="JPY">JPY</option>
                  <option value="TWD">TWD</option><option value="EUR">EUR</option>
                </select>
              </label>
              <label className="field field-span-2"><span>Notes</span><textarea name="notes" rows={3} /></label>
              <fieldset className="check-group field-span-2">
                <legend>Participants</legend>
                {members.map((member) => (
                  <label key={member.id}>
                    <input type="checkbox" name="participantMemberIds" value={member.id} />
                    <span>{member.displayName}</span>
                  </label>
                ))}
              </fieldset>
              <div className="form-actions field-span-2">
                <button className="button button-primary" type="submit"><CalendarPlus size={17} /> Add event</button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
