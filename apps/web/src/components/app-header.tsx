import { Compass, Plus } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
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
        <span className="avatar" title="示範旅人">
          示
        </span>
      </nav>
    </header>
  );
}
