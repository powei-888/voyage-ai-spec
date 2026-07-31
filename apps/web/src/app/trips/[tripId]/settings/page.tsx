import type { Trip } from "@voyage/shared";
import { Archive, Save, Settings } from "lucide-react";
import { archiveTripAction, updateTripAction } from "../../../actions/trip-actions";
import { Notice } from "../../../../components/notice";
import { PageHeading } from "../../../../components/page-heading";
import { apiGet } from "../../../../lib/api";
import { toDateInput } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const trip = await apiGet<Trip>(`/trips/${tripId}`);

  return (
    <div className="page-stack">
      <PageHeading eyebrow="Workspace" title="Trip settings" description="Dates, destination, budget, and lifecycle." />
      <Notice error={query.error} notice={query.notice} />

      <section className="form-panel">
        <div className="section-heading">
          <div><p className="eyebrow">General</p><h2>Trip details</h2></div>
          <Settings size={18} />
        </div>
        <form action={updateTripAction.bind(null, tripId)} className="form-grid">
          <label className="field field-span-2"><span>Trip name</span><input name="name" defaultValue={trip.name} required maxLength={120} /></label>
          <label className="field"><span>Country</span><input name="destinationCountry" defaultValue={trip.destinationCountry || ""} maxLength={80} /></label>
          <label className="field"><span>City</span><input name="destinationCity" defaultValue={trip.destinationCity || ""} maxLength={80} /></label>
          <label className="field"><span>Start date</span><input name="startDate" type="date" defaultValue={toDateInput(trip.startDate)} required /></label>
          <label className="field"><span>End date</span><input name="endDate" type="date" defaultValue={toDateInput(trip.endDate)} required /></label>
          <label className="field">
            <span>Currency</span>
            <select name="baseCurrency" defaultValue={trip.baseCurrency}>
              <option value="JPY">JPY</option><option value="USD">USD</option><option value="TWD">TWD</option>
              <option value="EUR">EUR</option><option value="KRW">KRW</option>
            </select>
          </label>
          <label className="field"><span>Budget</span><input name="budgetAmount" inputMode="decimal" defaultValue={trip.budgetAmount || ""} placeholder="No budget" /></label>
          <div className="form-actions field-span-2"><button className="button button-primary" type="submit"><Save size={16} /> Save settings</button></div>
        </form>
      </section>

      <section className="danger-zone">
        <div>
          <p className="eyebrow">Lifecycle</p>
          <h2>Archive trip</h2>
          <p>Archived trips stay available from the trips list and keep all records.</p>
        </div>
        {trip.status === "active" ? (
          <form action={archiveTripAction.bind(null, tripId)}>
            <button className="button button-danger" type="submit"><Archive size={16} /> Archive trip</button>
          </form>
        ) : <span className="status-pill status-archived">Archived</span>}
      </section>
    </div>
  );
}
