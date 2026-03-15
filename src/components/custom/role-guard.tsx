"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/utils/constants";
import { Lock } from "lucide-react";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";

interface RoleGuardProps {
  requiredRoles: string[];
  children: React.ReactNode;
}

export function RoleGuard({ requiredRoles, children }: RoleGuardProps) {
  const user = useQuery(api.users.getCurrentUser);
  const switchRole = useMutation(api.users.switchRole);
  const addRole = useMutation(api.users.addRole);

  if (user === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!user) {
    return null;
  }

  if (requiredRoles.includes(user.activeRole)) {
    return <>{children}</>;
  }

  const roleLabels = requiredRoles
    .map((r) => ROLE_LABELS[r] ?? r)
    .join(" or ");

  // Check if user already has one of the required roles (just not active)
  const switchableRole = requiredRoles.find((r) => user.roles.includes(r));
  // First required role the user doesn't have (for "add role" CTA)
  const addableRole = !switchableRole
    ? requiredRoles.find((r) => !user.roles.includes(r))
    : undefined;

  const handleSwitch = async (role: string) => {
    try {
      await switchRole({ role });
      showSuccess(`Switched to ${ROLE_LABELS[role] ?? role}`);
    } catch (error) {
      showErrorFromCatch(error);
    }
  };

  const handleAddRole = async (role: string) => {
    try {
      await addRole({ role });
      showSuccess(`Role "${ROLE_LABELS[role] ?? role}" added!`);
    } catch (error) {
      showErrorFromCatch(error);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>Access Restricted</CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>
          You need the <strong>{roleLabels}</strong> role to access this
          feature.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {switchableRole && (
            <Button
              size="sm"
              onClick={() => handleSwitch(switchableRole)}
            >
              Switch to {ROLE_LABELS[switchableRole] ?? switchableRole}
            </Button>
          )}
          {addableRole && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddRole(addableRole)}
            >
              Add {ROLE_LABELS[addableRole] ?? addableRole} Role
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
