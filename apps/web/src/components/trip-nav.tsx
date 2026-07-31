"use client";

import {
  Bot,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  Settings,
  TicketCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/receipts", label: "Receipts", icon: ReceiptText },
  { href: "/bookings", label: "Bookings", icon: TicketCheck },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/members", label: "Members", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav className="trip-nav" aria-label="Trip workspace">
      {items.map(({ href, label, icon: Icon }) => {
        const target = `${base}${href}`;
        const active = href === "" ? pathname === base : pathname.startsWith(target);
        return (
          <Link className={active ? "active" : ""} href={target} key={label} title={label}>
            <Icon size={17} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
