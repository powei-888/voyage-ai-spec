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
      <PageHeading eyebrow="旅程工作區" title="旅程設定" description="管理日期、目的地、預算與旅程狀態。" />
      <Notice error={query.error} notice={query.notice} />

      <section className="form-panel">
        <div className="section-heading">
          <div><p className="eyebrow">一般設定</p><h2>旅程資料</h2></div>
          <Settings size={18} />
        </div>
        <form action={updateTripAction.bind(null, tripId)} className="form-grid">
          <label className="field field-span-2"><span>旅程名稱</span><input name="name" defaultValue={trip.name} required maxLength={120} /></label>
          <label className="field"><span>國家</span><input name="destinationCountry" defaultValue={trip.destinationCountry || ""} maxLength={80} /></label>
          <label className="field"><span>城市</span><input name="destinationCity" defaultValue={trip.destinationCity || ""} maxLength={80} /></label>
          <label className="field"><span>開始日期</span><input name="startDate" type="date" defaultValue={toDateInput(trip.startDate)} required /></label>
          <label className="field"><span>結束日期</span><input name="endDate" type="date" defaultValue={toDateInput(trip.endDate)} required /></label>
          <label className="field">
            <span>幣別</span>
            <select name="baseCurrency" defaultValue={trip.baseCurrency}>
              <option value="JPY">日圓 (JPY)</option><option value="USD">美元 (USD)</option><option value="TWD">新台幣 (TWD)</option>
              <option value="EUR">歐元 (EUR)</option><option value="KRW">韓元 (KRW)</option>
            </select>
          </label>
          <label className="field"><span>預算</span><input name="budgetAmount" inputMode="decimal" defaultValue={trip.budgetAmount || ""} placeholder="未設定預算" /></label>
          <div className="form-actions field-span-2"><button className="button button-primary" type="submit"><Save size={16} /> 儲存設定</button></div>
        </form>
      </section>

      <section className="danger-zone">
        <div>
          <p className="eyebrow">旅程狀態</p>
          <h2>封存旅程</h2>
          <p>封存後仍可從旅程列表查看，所有資料都會保留。</p>
        </div>
        {trip.status === "active" ? (
          <form action={archiveTripAction.bind(null, tripId)}>
            <button className="button button-danger" type="submit"><Archive size={16} /> 封存旅程</button>
          </form>
        ) : <span className="status-pill status-archived">已封存</span>}
      </section>
    </div>
  );
}
