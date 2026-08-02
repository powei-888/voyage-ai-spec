import { Compass, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "../../components/notice";
import { PendingButton } from "../../components/pending-button";
import { getSessionToken } from "../../lib/session";
import { loginAction, registerAction } from "../actions/auth-actions";

type PageProps = { searchParams: Promise<{ mode?: string; error?: string; notice?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  if (await getSessionToken()) redirect("/");
  const query = await searchParams;
  const registering = query.mode === "register";

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark"><Compass size={22} /></span>
          <div><strong>Voyage AI</strong><span>旅程協作工作區</span></div>
        </div>
        <div className="auth-heading">
          <p className="eyebrow">內網帳號</p>
          <h1>{registering ? "建立帳號" : "歡迎回來"}</h1>
          <p>{registering ? "建立這台伺服器上的本機帳號。" : "登入後繼續管理你的旅程。"}</p>
        </div>
        <Notice error={query.error} notice={query.notice} />
        <form action={registering ? registerAction : loginAction} className="auth-form">
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
          {registering ? "已經有帳號？" : "還沒有帳號？"}
          <Link href={registering ? "/login" : "/login?mode=register"}>
            {registering ? "返回登入" : "建立本機帳號"}
          </Link>
        </p>
      </section>
    </main>
  );
}
