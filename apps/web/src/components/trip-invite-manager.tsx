"use client";

import type { TripInvite } from "@voyage/shared";
import {
  Check,
  Copy,
  Download,
  Link2,
  QrCode,
  Share2,
  ShieldCheck,
  TicketCheck,
  Users,
  XCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import { useActionState, useRef, useState } from "react";
import {
  createTripInviteAction,
  type InviteCreateActionState,
  revokeTripInviteAction
} from "../app/actions/trip-invite-actions";
import { formatDateTime } from "../lib/format";
import { ConfirmForm } from "./confirm-form";
import { PendingButton } from "./pending-button";

const initialState: InviteCreateActionState = {
  status: "idle",
  message: null,
  created: null
};

const statusLabel: Record<TripInvite["status"], string> = {
  active: "可使用",
  expired: "已過期",
  revoked: "已撤銷",
  full: "名額已滿",
  archived: "旅程已封存"
};

export function TripInviteManager({
  tripId,
  invites
}: {
  tripId: string;
  invites: TripInvite[];
}) {
  const [mode, setMode] = useState<"single" | "group">("single");
  const [feedback, setFeedback] = useState<string | null>(null);
  const qrContainer = useRef<HTMLDivElement>(null);
  const action = createTripInviteAction.bind(null, tripId);
  const [state, formAction] = useActionState(action, initialState);

  async function copyLink() {
    if (!state.created) return;
    try {
      await navigator.clipboard.writeText(state.created.shareUrl);
      setFeedback("已複製邀請連結");
    } catch {
      setFeedback("瀏覽器無法自動複製，請選取上方連結。");
    }
  }

  async function shareLink() {
    if (!state.created) return;
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({
        title: "Voyage AI 旅程邀請",
        text: "加入我的 Voyage AI 旅程",
        url: state.created.shareUrl
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback("無法開啟系統分享，請改用複製連結。");
    }
  }

  function downloadQr() {
    const svg = qrContainer.current?.querySelector("svg");
    if (!svg || !state.created) return;
    const source = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `voyage-invite-${state.created.invite.id}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback("QR Code 已下載");
  }

  return (
    <section className="content-section invite-manager" id="trip-invites">
      <div className="section-heading">
        <div><p className="eyebrow">分享旅程</p><h2>邀請旅伴加入</h2></div>
        <span><ShieldCheck size={15} /> 連結具有效期與名額限制</span>
      </div>

      <div className="invite-builder-layout">
        <form action={formAction} className="invite-create-form">
          <fieldset className="field invite-mode-field">
            <legend>邀請類型</legend>
            <div className="segmented-control">
              <label className={mode === "single" ? "active" : ""}>
                <input
                  checked={mode === "single"}
                  name="mode"
                  onChange={() => setMode("single")}
                  type="radio"
                  value="single"
                />
                <TicketCheck size={16} /> 單人邀請
              </label>
              <label className={mode === "group" ? "active" : ""}>
                <input
                  checked={mode === "group"}
                  name="mode"
                  onChange={() => setMode("group")}
                  type="radio"
                  value="group"
                />
                <Users size={16} /> 群組邀請
              </label>
            </div>
          </fieldset>
          <div className="invite-form-row">
            <label className="field">
              <span>有效期限</span>
              <select defaultValue="7" name="expiresInDays">
                <option value="1">1 天</option>
                <option value="7">7 天</option>
                <option value="14">14 天</option>
                <option value="30">30 天</option>
              </select>
            </label>
            <label className="field">
              <span>可加入人數</span>
              <input
                defaultValue={10}
                disabled={mode === "single"}
                max={100}
                min={2}
                name="maxUses"
                type="number"
              />
              <small>{mode === "single" ? "單人邀請使用後即額滿" : "每位登入者只會占用一次名額"}</small>
            </label>
          </div>
          <PendingButton className="button button-primary" pendingLabel="建立中…" type="submit">
            <Link2 size={16} /> 建立邀請連結
          </PendingButton>
          {state.message ? (
            <p className={`invite-action-message ${state.status}`} role="status">
              {state.status === "success" ? <Check size={16} /> : <XCircle size={16} />}
              {state.message}
            </p>
          ) : null}
        </form>

        {state.created ? (
          <div className="invite-share-result">
            <div className="invite-qr" ref={qrContainer}>
              <QRCode
                bgColor="#ffffff"
                fgColor="#17211f"
                level="M"
                size={184}
                title="旅程邀請 QR Code"
                value={state.created.shareUrl}
              />
            </div>
            <div className="invite-share-main">
              <div><p className="eyebrow">只顯示這一次</p><h3>分享邀請</h3></div>
              <input aria-label="邀請連結" onFocus={(event) => event.currentTarget.select()} readOnly value={state.created.shareUrl} />
              <div className="invite-share-actions">
                <button className="button button-secondary" onClick={copyLink} type="button"><Copy size={16} /> 複製</button>
                <button className="button button-secondary" onClick={shareLink} type="button"><Share2 size={16} /> 分享</button>
                <button className="button button-secondary" onClick={downloadQr} type="button"><Download size={16} /> 下載 QR</button>
              </div>
              {feedback ? <p className="invite-feedback" role="status">{feedback}</p> : null}
            </div>
          </div>
        ) : (
          <div className="invite-placeholder">
            <QrCode size={36} />
            <strong>建立後會在這裡顯示 QR Code</strong>
            <span>伺服器只保存 token hash，無法日後還原完整邀請連結。</span>
          </div>
        )}
      </div>

      <div className="invite-history">
        <div className="subsection-heading"><h3>邀請紀錄</h3><span>{invites.length} 份</span></div>
        {invites.length === 0 ? (
          <p className="invite-empty">尚未建立邀請。</p>
        ) : (
          <div className="invite-list">
            {invites.map((invite) => (
              <article className="invite-row" key={invite.id}>
                <div className="invite-row-main">
                  <div className="invite-row-heading">
                    <strong>{invite.mode === "single" ? "單人邀請" : "群組邀請"}</strong>
                    <span className={`invite-status invite-status-${invite.status}`}>{statusLabel[invite.status]}</span>
                  </div>
                  <p>
                    已使用 {invite.useCount}/{invite.maxUses} · 到期 {formatDateTime(invite.expiresAt)} · {invite.createdByMember.displayName} 建立
                  </p>
                  {invite.redemptions.length > 0 ? (
                    <div className="invite-redemptions">
                      {invite.redemptions.map((redemption) => (
                        <span key={redemption.id}>{redemption.user.displayName} · {formatDateTime(redemption.redeemedAt)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {invite.status === "active" ? (
                  <ConfirmForm
                    action={revokeTripInviteAction.bind(null, tripId, invite.id)}
                    message="撤銷後，已分享的連結與 QR Code 將立即失效。確定撤銷嗎？"
                  >
                    <button className="button button-danger button-compact" type="submit">撤銷</button>
                  </ConfirmForm>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
