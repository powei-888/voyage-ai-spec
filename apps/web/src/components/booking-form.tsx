import type { Booking, ItineraryEvent } from "@voyage/shared";
import { Save } from "lucide-react";
import { titleCase, toDateTimeInput } from "../lib/format";
import { BOOKING_TYPES } from "../lib/options";

export function BookingForm({
  action,
  events,
  booking,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  events: ItineraryEvent[];
  booking?: Booking;
  submitLabel: string;
}) {
  return (
    <form action={action} className="form-grid">
      <label className="field">
        <span>類型</span>
        <select name="type" defaultValue={booking?.type || "flight"}>
          {BOOKING_TYPES.map((type) => (
            <option value={type} key={type}>{titleCase(type)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>標題</span>
        <input name="title" defaultValue={booking?.title} placeholder="台北前往東京" required />
      </label>
      <label className="field">
        <span>供應商</span>
        <input name="provider" defaultValue={booking?.provider || ""} placeholder="航空公司或飯店" />
      </label>
      <label className="field">
        <span>確認碼</span>
        <input name="confirmationCode" defaultValue={booking?.confirmationCode || ""} placeholder="ABC123" />
      </label>
      <label className="field">
        <span>開始時間</span>
        <input name="startTime" type="datetime-local" defaultValue={toDateTimeInput(booking?.startTime || null)} />
      </label>
      <label className="field">
        <span>結束時間</span>
        <input name="endTime" type="datetime-local" defaultValue={toDateTimeInput(booking?.endTime || null)} />
      </label>
      <label className="field">
        <span>地點</span>
        <input name="location" defaultValue={booking?.location || ""} placeholder="成田機場" />
      </label>
      <label className="field">
        <span>關聯行程</span>
        <select name="linkedEventId" defaultValue={booking?.linkedEventId || ""}>
          <option value="">不關聯行程</option>
          {events.map((event) => (
            <option value={event.id} key={event.id}>{event.title}</option>
          ))}
        </select>
      </label>
      <label className="field field-span-2">
        <span>附件網址</span>
        <input name="attachmentUrl" type="url" defaultValue={booking?.attachmentUrl || ""} placeholder="https://" />
      </label>
      <div className="form-actions field-span-2">
        <button className="button button-primary" type="submit"><Save size={16} /> {submitLabel}</button>
      </div>
    </form>
  );
}
