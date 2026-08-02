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
import { ConfirmForm } from "../../../../components/confirm-form";
import { DraggableEvent } from "../../../../components/draggable-event";
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
  const travelers = members.filter((member) => member.kind === "traveler");
  const selectedDay = days.find((day) => day.id === query.day) || days[0];
  const orderedIds = selectedDay?.events.map((event) => event.id) || [];

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="行程規劃"
        title="每日行程"
        description="依日期安排活動、地點與同行成員。"
        actions={
          selectedDay ? (
            <a className="button button-primary" href="#add-event">
              <CalendarPlus size={17} /> 新增行程
            </a>
          ) : null
        }
      />
      <Notice error={query.error} notice={query.notice} />

      <nav className="day-tabs" aria-label="行程日期">
        {days.map((day) => (
          <Link
            className={selectedDay?.id === day.id ? "active" : ""}
            href={`/trips/${tripId}/timeline?day=${day.id}`}
            key={day.id}
          >
            <strong>第 {day.dayIndex} 天</strong>
            <span>{formatDate(day.date, { month: "short", day: "numeric" })}</span>
          </Link>
        ))}
      </nav>

      {!selectedDay ? (
        <EmptyState
          icon={CalendarPlus}
          title="尚無行程日期"
          body="請至設定確認旅程日期範圍。"
        />
      ) : (
        <>
          <section className="content-section">
            <div className="section-heading day-heading">
              <div>
                <p className="eyebrow">第 {selectedDay.dayIndex} 天</p>
                <h2>{selectedDay.title || formatDate(selectedDay.date)}</h2>
              </div>
              <span>{selectedDay.events.length} 個行程</span>
            </div>

            {selectedDay.events.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title="這一天尚未安排"
                body="先新增行程標題，時間與地點可以稍後補上。"
              />
            ) : (
              <div className="event-list">
                {selectedDay.events.map((event, index) => (
                  <DraggableEvent
                    tripId={tripId}
                    dayId={selectedDay.id}
                    eventId={event.id}
                    targetIndex={index}
                    key={event.id}
                  >
                  <article className="event-row">
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
                          <span><Link2 size={14} /> {event._count.bookings + event._count.expenses} 個關聯</span>
                        ) : null}
                      </div>
                      {event.notes ? <p>{event.notes}</p> : null}
                      <details className="edit-drawer">
                        <summary><Pencil size={14} /> 編輯行程</summary>
                        <form
                          action={updateEventAction.bind(null, tripId, selectedDay.id, event.id)}
                          className="form-grid compact-form"
                        >
                          <label className="field field-span-2">
                            <span>標題</span>
                            <input name="title" defaultValue={event.title} required />
                          </label>
                          <label className="field">
                            <span>分類</span>
                            <select name="category" defaultValue={event.category}>
                              {EVENT_CATEGORIES.map((category) => (
                                <option value={category} key={category}>{titleCase(category)}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>移到日期</span>
                            <select name="targetDayId" defaultValue={selectedDay.id}>
                              {days.map((day) => (
                                <option value={day.id} key={day.id}>第 {day.dayIndex} 天 · {formatDate(day.date)}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>地點</span>
                            <input name="locationName" defaultValue={event.locationName || ""} />
                          </label>
                          <label className="field field-span-2">
                            <span>地址</span>
                            <input name="address" defaultValue={event.address || ""} />
                          </label>
                          <label className="field">
                            <span>開始時間</span>
                            <input name="startTime" type="datetime-local" defaultValue={toDateTimeInput(event.startTime)} />
                          </label>
                          <label className="field">
                            <span>結束時間</span>
                            <input name="endTime" type="datetime-local" defaultValue={toDateTimeInput(event.endTime)} />
                          </label>
                          <label className="field">
                            <span>預估費用</span>
                            <input name="estimatedCostAmount" inputMode="decimal" defaultValue={event.estimatedCostAmount || ""} />
                          </label>
                          <label className="field">
                            <span>費用幣別</span>
                            <select name="estimatedCostCurrency" defaultValue={event.estimatedCostCurrency || trip.baseCurrency}>
                              <option value={trip.baseCurrency}>{trip.baseCurrency}</option>
                              <option value="USD">美元 (USD)</option><option value="JPY">日圓 (JPY)</option>
                              <option value="TWD">新台幣 (TWD)</option><option value="EUR">歐元 (EUR)</option>
                            </select>
                          </label>
                          <label className="field field-span-2">
                            <span>備註</span>
                            <textarea name="notes" rows={2} defaultValue={event.notes || ""} />
                          </label>
                          <fieldset className="check-group field-span-2">
                            <legend>參與成員</legend>
                            {travelers.map((member) => (
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
                            <button className="button button-secondary" type="submit">儲存變更</button>
                          </div>
                        </form>
                      </details>
                    </div>
                    <div className="event-row-actions">
                      <form action={reorderEventsAction.bind(null, tripId, selectedDay.id, moveEvent(orderedIds, index, -1))}>
                        <button className="icon-button" type="submit" title="向上移動行程" disabled={index === 0}>
                          <ArrowUp size={16} />
                        </button>
                      </form>
                      <form action={reorderEventsAction.bind(null, tripId, selectedDay.id, moveEvent(orderedIds, index, 1))}>
                        <button className="icon-button" type="submit" title="向下移動行程" disabled={index === orderedIds.length - 1}>
                          <ArrowDown size={16} />
                        </button>
                      </form>
                      <ConfirmForm
                        action={deleteEventAction.bind(null, tripId, selectedDay.id, event.id)}
                        message="要刪除這個行程嗎？"
                      >
                        <button className="icon-button danger" type="submit" title="刪除行程">
                          <Trash2 size={16} />
                        </button>
                      </ConfirmForm>
                    </div>
                  </article>
                  </DraggableEvent>
                ))}
              </div>
            )}
          </section>

          <section className="form-panel" id="add-event">
            <div className="section-heading">
              <div><p className="eyebrow">第 {selectedDay.dayIndex} 天</p><h2>新增行程</h2></div>
            </div>
            <form action={createEventAction.bind(null, tripId, selectedDay.id)} className="form-grid">
              <label className="field field-span-2">
                <span>標題</span>
                <input name="title" placeholder="淺草寺晨間散步" required />
              </label>
              <label className="field">
                <span>分類</span>
                <select name="category" defaultValue="attraction">
                  {EVENT_CATEGORIES.map((category) => (
                    <option value={category} key={category}>{titleCase(category)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>地點</span>
                <input name="locationName" placeholder="淺草" />
              </label>
              <label className="field field-span-2">
                <span>地址</span>
                <input name="address" placeholder="東京都台東區淺草 2-3-1" />
              </label>
              <label className="field"><span>開始時間</span><input name="startTime" type="datetime-local" /></label>
              <label className="field"><span>結束時間</span><input name="endTime" type="datetime-local" /></label>
              <label className="field">
                <span>預估費用</span>
                <input name="estimatedCostAmount" inputMode="decimal" placeholder="0" />
              </label>
              <label className="field">
                <span>費用幣別</span>
                <select name="estimatedCostCurrency" defaultValue={trip.baseCurrency}>
                  <option value={trip.baseCurrency}>{trip.baseCurrency}</option>
                  <option value="USD">美元 (USD)</option><option value="JPY">日圓 (JPY)</option>
                  <option value="TWD">新台幣 (TWD)</option><option value="EUR">歐元 (EUR)</option>
                </select>
              </label>
              <label className="field field-span-2"><span>備註</span><textarea name="notes" rows={3} /></label>
              <fieldset className="check-group field-span-2">
                <legend>參與成員</legend>
                {travelers.map((member) => (
                  <label key={member.id}>
                    <input type="checkbox" name="participantMemberIds" value={member.id} />
                    <span>{member.displayName}</span>
                  </label>
                ))}
              </fieldset>
              <div className="form-actions field-span-2">
                <button className="button button-primary" type="submit"><CalendarPlus size={17} /> 新增行程</button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
