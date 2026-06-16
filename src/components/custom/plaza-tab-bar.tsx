"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, MapPin, Ticket } from "lucide-react";

// Bottom tab bar for the public site on phones — the app-shell nav from the
// TIX.PH Mobile design. Mirrors the primary destinations; active tab in coral.
const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/events", label: "Browse", icon: CalendarDays, match: (p: string) => p.startsWith("/events") },
  { href: "/venues", label: "Venues", icon: MapPin, match: (p: string) => p.startsWith("/venues") },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket, match: (p: string) => p.startsWith("/dashboard/tickets") },
];

export function PlazaTabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`tab${active ? " on" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            <span className="lb">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
