import type { LocalUser } from "@voyage/shared";
import { Compass, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "../app/actions/auth-actions";
import { apiGet } from "../lib/api";

export async function AppHeader() {
  const user = await apiGet<LocalUser>("/auth/me");
  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="Voyage AI 旅程">
        <span className="brand-mark" aria-hidden="true">
          <Compass size={19} strokeWidth={2.2} />
        </span>
        <span>Voyage AI</span>
      </Link>
      <nav className="header-actions" aria-label="全域導覽">
        <Link className="button button-primary button-compact" href="/#create-trip" title="建立旅程">
          <Plus size={16} />
          <span>新增旅程</span>
        </Link>
        <Link className="avatar" href="/account" title={`${user.displayName} · 帳號安全`} aria-label="帳號安全">
          {user.displayName.slice(0, 1).toUpperCase()}
        </Link>
        <form action={logoutAction}>
          <button className="icon-button" type="submit" title="登出">
            <LogOut size={16} />
          </button>
        </form>
      </nav>
    </header>
  );
}
