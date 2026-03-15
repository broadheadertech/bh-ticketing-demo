"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ROLES, ROLE_LABELS } from "@/lib/utils/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { Plus } from "lucide-react";

export function RequestRoleButton() {
  const user = useQuery(api.users.getCurrentUser);
  const addRole = useMutation(api.users.addRole);

  if (!user) return null;

  const availableRoles = ROLES.filter(
    (role) => !user.roles.includes(role)
  );

  if (availableRoles.length === 0) return null;

  const handleRequest = async (role: string) => {
    try {
      await addRole({ role });
      showSuccess(`Role "${ROLE_LABELS[role] ?? role}" added!`);
    } catch (error) {
      showErrorFromCatch(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Role</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {availableRoles.map((role) => (
          <DropdownMenuItem key={role} onClick={() => handleRequest(role)}>
            {ROLE_LABELS[role] ?? role}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
