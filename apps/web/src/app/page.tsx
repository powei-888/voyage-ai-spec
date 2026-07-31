import type { Trip } from "@voyage/shared";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  PlaneTakeoff,
  Terminal,
  Users
} from "lucide-react";
import Link from "next/link";
import { createTripAction } from "./actions/trip-actions";
import { AppHeader } from "../components/app-header";
import { EmptyState } from "../components/empty-state";
import { Notice } from "../components/notice";
import { PageHeading } from "../components/page-heading";
import { safeApiGet } from "../lib/api";
import { formatDateRange } from "../lib/format";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const result = await safeApiGet<Trip[]>("/trips");
  const trips = result.data ?? [];
  const today = new Date();
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 3);

  const dateInput = (date: Date) => date.toISOString().slice(0, 10);

  return (
    <div className="app-frame">
      <AppHeader />
      <main className="trips-page">
        <PageHeading
          eyebrow="Workspace"
          title="Trips"
          description="Active and archived travel workspaces."
        />
        <Notice error={params.error || result.error || undefined} notice={params.notice} />

        <section className="trip-list" aria-label="Trip workspaces">
          {trips.length === 0 ? (
            <EmptyState
              icon={PlaneTakeoff}
              title="No trips yet"
              body="Create the first workspace below."
            />
          ) : (
            trips.map((trip) => {
              const destination =
                [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ") ||
                "Destination open";
              const nextEvent = trip.events?.[0];
              return (
                <Link className="trip-card" href={`/trips/${trip.id}`} key={trip.id}>
                  <span className="trip-card-mark" aria-hidden="true">
                    {trip.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="trip-card-main">
                    <span className="trip-card-title-row">
                      <strong>{trip.name}</strong>
                      <span className={`status-pill status-${trip.status}`}>{trip.status}</span>
                    </span>
                    <span className="trip-meta">
                      <span><MapPin size={14} /> {destination}</span>
                      <span><CalendarDays size={14} /> {formatDateRange(trip.startDate, trip.endDate)}</span>
                      <span><Users size={14} /> {trip._count.members} members</span>
                    </span>
                    <span className="trip-next">
                      {nextEvent ? `Next: ${nextEvent.title}` : "No upcoming event"}
                    </span>
                  </span>
                  <ArrowRight className="trip-card-arrow" size={20} />
                </Link>
              );
            })
          )}
        </section>

        <section className="form-panel" id="create-trip">
          <div className="section-heading">
            <div>
              <p className="eyebrow">New workspace</p>
              <h2>Create trip</h2>
            </div>
          </div>
          <form action={createTripAction} className="form-grid">
            <label className="field field-span-2">
              <span>Trip name</span>
              <input name="name" placeholder="Tokyo Autumn Escape" required maxLength={120} />
            </label>
            <label className="field">
              <span>Country</span>
              <input name="destinationCountry" placeholder="Japan" maxLength={80} />
            </label>
            <label className="field">
              <span>City</span>
              <input name="destinationCity" placeholder="Tokyo" maxLength={80} />
            </label>
            <label className="field">
              <span>Start date</span>
              <input name="startDate" type="date" defaultValue={dateInput(today)} required />
            </label>
            <label className="field">
              <span>End date</span>
              <input name="endDate" type="date" defaultValue={dateInput(end)} required />
            </label>
            <label className="field">
              <span>Currency</span>
              <select name="baseCurrency" defaultValue="JPY">
                <option value="JPY">JPY</option>
                <option value="USD">USD</option>
                <option value="TWD">TWD</option>
                <option value="EUR">EUR</option>
                <option value="KRW">KRW</option>
              </select>
            </label>
            <label className="field">
              <span>Budget</span>
              <input name="budgetAmount" inputMode="decimal" placeholder="120000" />
            </label>
            <div className="form-actions field-span-2">
              <button className="button button-primary" type="submit">
                <PlaneTakeoff size={17} /> Create trip
              </button>
            </div>
          </form>
        </section>

        {result.error ? (
          <div className="setup-hint">
            <Terminal size={18} />
            <span>Start the API and PostgreSQL services, then reload this page.</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
