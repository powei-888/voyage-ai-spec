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
import { PendingButton } from "../components/pending-button";
import { safeApiGet } from "../lib/api";
import { formatDateRange, titleCase } from "../lib/format";
import { requireSession } from "../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  await requireSession();
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
          eyebrow="旅程工作區"
          title="我的旅程"
          description="管理進行中與已封存的旅程。"
        />
        <Notice error={params.error || result.error || undefined} notice={params.notice} />

        <section className="trip-list" aria-label="旅程工作區">
          {trips.length === 0 ? (
            <EmptyState
              icon={PlaneTakeoff}
              title="還沒有旅程"
              body="從下方建立第一個旅程。"
            />
          ) : (
            trips.map((trip) => {
              const destination =
                [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ") ||
                "尚未設定目的地";
              const nextEvent = trip.events?.[0];
              return (
                <Link className="trip-card" href={`/trips/${trip.id}`} key={trip.id}>
                  <span className="trip-card-mark" aria-hidden="true">
                    {trip.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="trip-card-main">
                    <span className="trip-card-title-row">
                      <strong>{trip.name}</strong>
                      <span className={`status-pill status-${trip.status}`}>{titleCase(trip.status)}</span>
                    </span>
                    <span className="trip-meta">
                      <span><MapPin size={14} /> {destination}</span>
                      <span><CalendarDays size={14} /> {formatDateRange(trip.startDate, trip.endDate)}</span>
                      <span><Users size={14} /> {trip._count.members} 位成員</span>
                    </span>
                    <span className="trip-next">
                      {nextEvent ? `下一個：${nextEvent.title}` : "暫無即將到來的行程"}
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
              <p className="eyebrow">新增旅程</p>
              <h2>建立旅程</h2>
            </div>
          </div>
          <form action={createTripAction} className="form-grid">
            <label className="field field-span-2">
              <span>旅程名稱</span>
              <input name="name" placeholder="東京秋日之旅" required maxLength={120} />
            </label>
            <label className="field">
              <span>國家</span>
              <input name="destinationCountry" placeholder="日本" maxLength={80} />
            </label>
            <label className="field">
              <span>城市</span>
              <input name="destinationCity" placeholder="東京" maxLength={80} />
            </label>
            <label className="field">
              <span>開始日期</span>
              <input name="startDate" type="date" defaultValue={dateInput(today)} required />
            </label>
            <label className="field">
              <span>結束日期</span>
              <input name="endDate" type="date" defaultValue={dateInput(end)} required />
            </label>
            <label className="field">
              <span>幣別</span>
              <select name="baseCurrency" defaultValue="JPY">
                <option value="JPY">日圓 (JPY)</option>
                <option value="USD">美元 (USD)</option>
                <option value="TWD">新台幣 (TWD)</option>
                <option value="EUR">歐元 (EUR)</option>
                <option value="KRW">韓元 (KRW)</option>
              </select>
            </label>
            <label className="field">
              <span>預算</span>
              <input name="budgetAmount" inputMode="decimal" placeholder="120000" />
            </label>
            <div className="form-actions field-span-2">
              <PendingButton className="button button-primary" type="submit" pendingLabel="建立中…">
                <PlaneTakeoff size={17} /> 建立旅程
              </PendingButton>
            </div>
          </form>
        </section>

        {result.error ? (
          <div className="setup-hint">
            <Terminal size={18} />
            <span>請先啟動 API 與 PostgreSQL 服務，再重新載入此頁。</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
