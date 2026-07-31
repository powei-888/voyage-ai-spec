import type { Trip } from "@voyage/shared";
import { ChevronLeft, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateRange } from "../lib/format";
import { AppHeader } from "./app-header";
import { TripNav } from "./trip-nav";

export function TripShell({ trip, children }: { trip: Trip; children: ReactNode }) {
  const destination =
    [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ") ||
    "Destination open";

  return (
    <div className="app-frame">
      <AppHeader />
      <div className="workspace">
        <aside className="workspace-sidebar">
          <Link className="back-link" href="/">
            <ChevronLeft size={15} /> All trips
          </Link>
          <div className="trip-identity">
            <span className="trip-monogram" aria-hidden="true">
              {trip.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{trip.name}</strong>
              <span><MapPin size={13} /> {destination}</span>
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>
          </div>
          <TripNav tripId={trip.id} />
        </aside>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}
