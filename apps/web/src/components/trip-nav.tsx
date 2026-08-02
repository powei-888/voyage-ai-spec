"use client";

import {
  Bot,
  CalendarDays,
  CreditCard,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingBag,
  TicketCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "", label: "總覽", icon: LayoutDashboard },
  { href: "/timeline", label: "行程表", icon: CalendarDays },
  { href: "/expenses", label: "支出", icon: CreditCard },
  { href: "/funds", label: "公費", icon: Landmark },
  { href: "/proxy-purchases", label: "代購", icon: ShoppingBag },
  { href: "/receipts", label: "收據", icon: ReceiptText },
  { href: "/bookings", label: "預訂", icon: TicketCheck },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/members", label: "成員", icon: Users },
  { href: "/settings", label: "設定", icon: Settings }
];

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav className="trip-nav" aria-label="旅程工作區">
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
