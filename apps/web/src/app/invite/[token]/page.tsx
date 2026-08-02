import type { Metadata } from "next";
import type { TripInvitePreview } from "@voyage/shared";
import {
  CalendarDays,
  CheckCircle2,
  Compass,
  Link2Off,
  LogIn,
  MapPin,
  ShieldCheck,
  UserPlus,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { Notice } from "../../../components/notice";
import { PendingButton } from "../../../components/pending-button";
import { ApiClientError, apiPublicGet } from "../../../lib/api";
import { formatDateRange, formatDateTime } from "../../../lib/format";
import { getSessionToken } from "../../../lib/session";
import { acceptTripInviteAction } from "../../actions/trip-invite-actions";

export const metadata: Metadata = {
  title: "旅程邀請",
  robots: { index: false, follow: false }
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

const statusCopy: Record<Exclude<TripInvitePreview["status"], "active">, { title: string; body: string }> = {
  expired: { title: "邀請已過期", body: "請聯絡旅程擁有者建立新的邀請連結。" },
  revoked: { title: "邀請已撤銷", body: "這份邀請已由旅程擁有者停用。" },
  full: { title: "邀請名額已滿", body: "這份邀請已達使用上限，請索取新的邀請。" },
  archived: { title: "旅程已封存", body: "封存中的旅程目前不接受新成員。" }
};

export default async function InvitePage({ params, searchParams }: PageProps) {
  const [{ token }, query, sessionToken] = await Promise.all([
    params,
    searchParams,
    getSessionToken()
  ]);
  let preview: TripInvitePreview | null = null;
  let loadError: string | null = null;
  try {
    preview = await apiPublicGet<TripInvitePreview>(`/invites/${encodeURIComponent(token)}`);
  } catch (error) {
    loadError = error instanceof ApiClientError ? error.message : "目前無法讀取邀請。";
  }

  if (!preview) {
    return (
      <main className="invite-page">
        <section className="invite-public-shell invite-invalid">
          <Brand />
          <Link2Off size={42} />
          <h1>邀請連結無效</h1>
          <p>{loadError || "找不到這份邀請。"}</p>
          <Link className="button button-secondary" href="/login"><LogIn size={16} /> 前往登入</Link>
        </section>
      </main>
    );
  }

  const destination = [preview.trip.destinationCity, preview.trip.destinationCountry]
    .filter(Boolean)
    .join("、") || "目的地尚未設定";
  const returnPath = `/invite/${encodeURIComponent(token)}`;
  const loginParams = new URLSearchParams({ next: returnPath, invite: token });
  const registerParams = new URLSearchParams({ mode: "register", next: returnPath, invite: token });
  const inactive = preview.status === "active" ? null : statusCopy[preview.status];

  return (
    <main className="invite-page">
      <section className="invite-public-shell">
        <Brand />
        <div className="invite-public-heading">
          <span className="invite-public-icon"><Compass size={28} /></span>
          <p className="eyebrow">{preview.invitedBy.displayName} 邀請你</p>
          <h1>{preview.trip.name}</h1>
          <p>加入後即可查看完整行程、支出、收據與旅程協作內容。</p>
        </div>
        <Notice error={query.error} />
        <dl className="invite-trip-summary">
          <div><dt><MapPin size={17} /> 目的地</dt><dd>{destination}</dd></div>
          <div><dt><CalendarDays size={17} /> 旅程日期</dt><dd>{formatDateRange(preview.trip.startDate, preview.trip.endDate)}</dd></div>
          <div><dt><UserRound size={17} /> 邀請人</dt><dd>{preview.invitedBy.displayName}</dd></div>
          <div><dt><ShieldCheck size={17} /> 邀請狀態</dt><dd>{preview.mode === "single" ? "單人邀請" : `群組邀請，剩餘 ${preview.remainingUses} 個名額`} · {formatDateTime(preview.expiresAt)} 到期</dd></div>
        </dl>

        {inactive ? (
          <div className="invite-unavailable" role="status">
            <Link2Off size={22} />
            <div><strong>{inactive.title}</strong><span>{inactive.body}</span></div>
          </div>
        ) : sessionToken ? (
          <form action={acceptTripInviteAction.bind(null, token)} className="invite-cta-stack">
            <PendingButton className="button button-primary invite-primary-cta" pendingLabel="加入中…" type="submit">
              <CheckCircle2 size={18} /> 接受邀請並加入旅程
            </PendingButton>
            <span>你已登入，確認後會以旅伴身分加入；不會與同名代購對象自動合併。</span>
          </form>
        ) : (
          <div className="invite-cta-stack">
            <Link className="button button-primary invite-primary-cta" href={`/login?${loginParams}`}>
              <LogIn size={18} /> 我已有帳號
            </Link>
            <Link className="button button-secondary invite-primary-cta" href={`/login?${registerParams}`}>
              <UserPlus size={18} /> 建立帳號並加入
            </Link>
            <span>只會顯示旅程摘要；登入並接受後才會開放完整內容。</span>
          </div>
        )}
      </section>
    </main>
  );
}

function Brand() {
  return (
    <Link className="auth-brand invite-brand" href="/login">
      <span className="brand-mark"><Compass size={22} /></span>
      <div><strong>Voyage AI</strong><span>旅程協作工作區</span></div>
    </Link>
  );
}
