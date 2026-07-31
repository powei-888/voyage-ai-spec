import type { Trip } from "@voyage/shared";
import type { ReactNode } from "react";
import { TripShell } from "../../../components/trip-shell";
import { apiGet } from "../../../lib/api";
import { requireSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

export default async function TripLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  await requireSession();
  const { tripId } = await params;
  const trip = await apiGet<Trip>(`/trips/${tripId}`);

  return <TripShell trip={trip}>{children}</TripShell>;
}
