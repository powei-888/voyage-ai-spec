import type { LocalUser } from "@voyage/shared";
import { KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { AppHeader } from "../../components/app-header";
import { Notice } from "../../components/notice";
import { PageHeading } from "../../components/page-heading";
import { PendingButton } from "../../components/pending-button";
import { apiGet } from "../../lib/api";
import { requireSession } from "../../lib/session";
import { changePasswordAction, logoutAllAction } from "../actions/auth-actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ error?: string; notice?: string }> };

export default async function AccountPage({ searchParams }: PageProps) {
  await requireSession();
  const [user, query] = await Promise.all([apiGet<LocalUser>("/auth/me"), searchParams]);

  return (
    <div className="app-frame">
      <AppHeader />
      <main className="trips-page account-page">
        <PageHeading eyebrow="個人設定" title="帳號安全" description="管理本機帳號密碼與登入狀態。" />
        <Notice error={query.error} notice={query.notice} />

        <section className="content-section account-identity">
          <div><UserRound size={18} /><span>顯示名稱</span><strong>{user.displayName}</strong></div>
          <div><Mail size={18} /><span>電子郵件</span><strong>{user.email}</strong></div>
        </section>

        <section className="form-panel">
          <div className="section-heading"><div><p className="eyebrow">登入憑證</p><h2>更換密碼</h2></div><KeyRound size={18} /></div>
          <form action={changePasswordAction} className="form-grid account-security-form">
            <label className="field field-span-2"><span>目前密碼</span><input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label>
            <label className="field"><span>新密碼</span><input name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
            <label className="field"><span>確認新密碼</span><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
            <div className="form-actions field-span-2"><PendingButton className="button button-primary" type="submit" pendingLabel="更新中…"><ShieldCheck size={16} /> 更新密碼</PendingButton></div>
          </form>
        </section>

        <section className="form-panel danger-zone">
          <div><p className="eyebrow">Session</p><h2>登出所有裝置</h2><p>撤銷此帳號目前所有登入狀態。</p></div>
          <form action={logoutAllAction}><PendingButton className="button button-danger" type="submit" pendingLabel="登出中…"><LogOut size={16} /> 全部登出</PendingButton></form>
        </section>
      </main>
    </div>
  );
}
