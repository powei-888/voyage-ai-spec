import { Compass, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "../../components/notice";
import { PendingButton } from "../../components/pending-button";
import { getSessionToken } from "../../lib/session";
import { safeReturnPath } from "../../lib/navigation";
import { loginAction, registerAction } from "../actions/auth-actions";

type PageProps = {
  searchParams: Promise<{
    mode?: string;
    error?: string;
    notice?: string;
    invite?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const returnTo = safeReturnPath(query.next);
  if (await getSessionToken()) redirect(returnTo);
  const inviteToken = query.invite?.trim() || "";
  const registering = query.mode === "register" && Boolean(inviteToken);
  const invitationContext = Boolean(inviteToken);
  const loginQuery = new URLSearchParams();
  const registerQuery = new URLSearchParams({ mode: "register" });
  if (invitationContext) {
    loginQuery.set("invite", inviteToken);
    registerQuery.set("invite", inviteToken);
  }
  if (returnTo !== "/") {
    loginQuery.set("next", returnTo);
    registerQuery.set("next", returnTo);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark"><Compass size={22} /></span>
          <div><strong>Voyage AI</strong><span>旅程協作工作區</span></div>
        </div>
        <div className="auth-heading">
          <p className="eyebrow">{invitationContext ? "旅程邀請" : "本機帳號"}</p>
          <h1>{registering ? "建立帳號" : "歡迎回來"}</h1>
          <p>{registering ? "建立帳號後會直接加入受邀旅程。" : invitationContext ? "登入後即可確認並加入受邀旅程。" : "登入後繼續管理你的旅程。"}</p>
        </div>
        <Notice
          error={query.error || (query.mode === "register" && !inviteToken ? "註冊需從有效的旅程邀請連結開始。" : undefined)}
          notice={query.notice}
        />
        <form action={registering ? registerAction : loginAction} className="auth-form">
          <input name="returnTo" type="hidden" value={returnTo} />
          {inviteToken ? <input name="inviteToken" type="hidden" value={inviteToken} /> : null}
          {registering ? (
            <label className="field">
              <span>顯示名稱</span>
              <input name="displayName" autoComplete="name" required maxLength={80} />
            </label>
          ) : null}
          <label className="field">
            <span>電子郵件</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>密碼</span>
            <input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={8} required />
          </label>
          <PendingButton className="button button-primary auth-submit" type="submit" pendingLabel="驗證中…">
            {registering ? <UserPlus size={17} /> : <LogIn size={17} />}
            {registering ? "建立並登入" : "登入"}
          </PendingButton>
        </form>
        <p className="auth-switch">
          {registering ? "已經有帳號？" : invitationContext ? "第一次使用 Voyage AI？" : "新成員需使用旅程邀請連結建立帳號。"}
          {registering ? (
            <Link href={`/login?${loginQuery}`}>返回登入</Link>
          ) : invitationContext ? (
            <Link href={`/login?${registerQuery}`}>建立帳號並加入</Link>
          ) : null}
        </p>
      </section>
    </main>
  );
}
