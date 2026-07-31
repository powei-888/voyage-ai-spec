import type { Trip } from "@voyage/shared";
import type { ReactNode } from "react";
import { TripShell } from "../../../components/trip-shell";
import { apiGet } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function TripLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = await apiGet<Trip>(`/trips/${tripId}`);

  return <TripShell trip={trip}>{children}</TripShell>;
}
