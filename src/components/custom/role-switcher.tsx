"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { ROLE_LABELS } from "@/lib/utils/constants";
import {
  ChevronDown,
  Check,
  Ticket,
  Music,
  Building2,
  MapPin,
  Shield,
} from "lucide-react";

const ROLE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  attendee: Ticket,
  artist: Music,
  organization: Building2,
  venue_manager: MapPin,
  admin: Shield,
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function RoleIcon({ role, className }: { role: string; className?: string }) {
  const Icon = ROLE_ICONS[role] ?? Ticket;
  return <Icon className={className} />;
}

export function RoleSwitcher() {
  const user = useQuery(api.users.getCurrentUser);
  const switchRole = useMutation(api.users.switchRole);

  if (user === undefined) {
    return <Skeleton className="h-9 w-36" />;
  }

  if (!user) return null;

  if (user.roles.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
        <RoleIcon role={user.activeRole} className="h-4 w-4" />
        <span>{getRoleLabel(user.activeRole)}</span>
      </div>
    );
  }

  const handleSwitch = async (role: string) => {
    if (role === user.activeRole) return;
    try {
      await switchRole({ role });
      showSuccess(`Switched to ${getRoleLabel(role)}`);
    } catch (error) {
      showErrorFromCatch(error);
    }
  };

  return (
    <>
      <div aria-live="polite" className="sr-only">
        Current role: {getRoleLabel(user.activeRole)}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-haspopup="listbox"
        >
          <RoleIcon role={user.activeRole} className="h-4 w-4" />
          <span className="flex-1 text-left">{getRoleLabel(user.activeRole)}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {user.roles.map((role) => {
            const isActive = role === user.activeRole;
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleSwitch(role)}
                aria-checked={isActive}
                className="flex items-center gap-2"
              >
                <RoleIcon role={role} className="h-4 w-4" />
                <span className="flex-1">{getRoleLabel(role)}</span>
                {isActive && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
