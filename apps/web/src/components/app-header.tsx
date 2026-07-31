import { Compass, Plus } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="Voyage AI trips">
        <span className="brand-mark" aria-hidden="true">
          <Compass size={19} strokeWidth={2.2} />
        </span>
        <span>Voyage AI</span>
      </Link>
      <nav className="header-actions" aria-label="Global navigation">
        <Link className="button button-primary button-compact" href="/#create-trip" title="Create trip">
          <Plus size={16} />
          <span>New trip</span>
        </Link>
        <span className="avatar" title="Demo Traveler">
          DT
        </span>
      </nav>
    </header>
  );
}
