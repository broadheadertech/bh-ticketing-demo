"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ticket,
  Search,
  Calendar,
  PlusCircle,
  DollarSign,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Settings,
  Heart,
  PanelsTopLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  attendee: [
    { label: "My Tickets", href: "/dashboard/tickets", icon: Ticket },
    { label: "Following", href: "/dashboard/following", icon: Heart },
    { label: "Discover Events", href: "/events", icon: Search },
  ],
  artist: [
    { label: "My Events", href: "/dashboard/events", icon: Calendar },
    { label: "Create Event", href: "/dashboard/events/create", icon: PlusCircle },
    { label: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
  organization: [
    { label: "My Events", href: "/dashboard/events", icon: Calendar },
    { label: "Create Event", href: "/dashboard/events/create", icon: PlusCircle },
    { label: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ],
  venue_manager: [
    { label: "My Venues", href: "/dashboard/venues", icon: Building2 },
    { label: "Availability", href: "/dashboard/venues/availability", icon: CalendarDays },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Users", href: "/dashboard/admin/users", icon: Users },
    { label: "Moderation", href: "/dashboard/admin/moderation", icon: Shield },
    { label: "Financial", href: "/dashboard/admin/financial", icon: BarChart3 },
  ],
  staff: [
    { label: "My Assignments", href: "/dashboard/staff", icon: Shield },
  ],
};

function NavIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return <Icon className={className} />;
}

export function SidebarNav() {
  const user = useQuery(api.users.getCurrentUser);
  const pathname = usePathname();

  if (user === undefined) {
    return (
      <div className="space-y-2 px-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (!user) return null;

  const items = NAV_ITEMS[user.activeRole] ?? NAV_ITEMS.attendee;

  return (
    <nav className="space-y-1 px-2">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground border-l-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <NavIcon icon={item.icon} className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="my-2 border-t" />
      <Link
        href="/backoffice"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <NavIcon icon={PanelsTopLeft} className="h-4 w-4" />
        Back Office
      </Link>
    </nav>
  );
}
