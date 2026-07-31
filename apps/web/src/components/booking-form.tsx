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
        <span>Type</span>
        <select name="type" defaultValue={booking?.type || "flight"}>
          {BOOKING_TYPES.map((type) => (
            <option value={type} key={type}>{titleCase(type)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Title</span>
        <input name="title" defaultValue={booking?.title} placeholder="TPE to NRT" required />
      </label>
      <label className="field">
        <span>Provider</span>
        <input name="provider" defaultValue={booking?.provider || ""} placeholder="Airline or hotel" />
      </label>
      <label className="field">
        <span>Confirmation code</span>
        <input name="confirmationCode" defaultValue={booking?.confirmationCode || ""} placeholder="ABC123" />
      </label>
      <label className="field">
        <span>Starts</span>
        <input name="startTime" type="datetime-local" defaultValue={toDateTimeInput(booking?.startTime || null)} />
      </label>
      <label className="field">
        <span>Ends</span>
        <input name="endTime" type="datetime-local" defaultValue={toDateTimeInput(booking?.endTime || null)} />
      </label>
      <label className="field">
        <span>Location</span>
        <input name="location" defaultValue={booking?.location || ""} placeholder="Narita Airport" />
      </label>
      <label className="field">
        <span>Linked event</span>
        <select name="linkedEventId" defaultValue={booking?.linkedEventId || ""}>
          <option value="">No linked event</option>
          {events.map((event) => (
            <option value={event.id} key={event.id}>{event.title}</option>
          ))}
        </select>
      </label>
      <label className="field field-span-2">
        <span>Attachment URL</span>
        <input name="attachmentUrl" type="url" defaultValue={booking?.attachmentUrl || ""} placeholder="https://" />
      </label>
      <div className="form-actions field-span-2">
        <button className="button button-primary" type="submit"><Save size={16} /> {submitLabel}</button>
      </div>
    </form>
  );
}
