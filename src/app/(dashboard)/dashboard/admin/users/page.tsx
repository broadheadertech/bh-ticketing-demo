"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLES, ROLE_LABELS } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/format";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { Search } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <RoleGuard requiredRoles={["admin"]}>
      <AdminUsersContent />
    </RoleGuard>
  );
}

type UserRow = {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  activeRole: string;
  isActive: boolean;
  createdAt: number;
};

function AdminUsersContent() {
  const users = useQuery(api.admin.listUsers);
  const disableUser = useMutation(api.admin.disableUser);
  const enableUser = useMutation(api.admin.enableUser);
  const updateRoles = useMutation(api.admin.adminUpdateUserRoles);

  const [search, setSearch] = useState("");
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<"disable" | "enable">(
    "disable"
  );
  const [roleUser, setRoleUser] = useState<UserRow | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);

  if (users === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function openDisableConfirm(user: UserRow) {
    setConfirmUser(user);
    setConfirmAction(user.isActive ? "disable" : "enable");
  }

  async function handleToggleActive() {
    if (!confirmUser) return;
    setIsPending(true);
    try {
      if (confirmAction === "disable") {
        await disableUser({ userId: confirmUser._id as never });
        showSuccess(`${confirmUser.name} has been disabled`);
      } else {
        await enableUser({ userId: confirmUser._id as never });
        showSuccess(`${confirmUser.name} has been enabled`);
      }
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPending(false);
      setConfirmUser(null);
    }
  }

  function openRoleDialog(user: UserRow) {
    setRoleUser(user);
    setSelectedRoles([...user.roles]);
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSaveRoles() {
    if (!roleUser) return;
    setIsPending(true);
    try {
      await updateRoles({
        userId: roleUser._id as never,
        roles: selectedRoles,
      });
      showSuccess(`Roles updated for ${roleUser.name}`);
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPending(false);
      setRoleUser(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Active Role</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {ROLE_LABELS[role] ?? role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>{ROLE_LABELS[user.activeRole] ?? user.activeRole}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={user.isActive ? "destructive" : "default"}
                        onClick={() => openDisableConfirm(user)}
                      >
                        {user.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRoleDialog(user)}
                      >
                        Manage Roles
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Disable/Enable Confirmation Dialog */}
      <AlertDialog
        open={!!confirmUser}
        onOpenChange={(open) => !open && setConfirmUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "disable" ? "Disable" : "Enable"} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction}{" "}
              <strong>{confirmUser?.name}</strong> ({confirmUser?.email})?
              {confirmAction === "disable" &&
                " They will not be able to use the platform."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={isPending}>
              {isPending ? "Processing..." : confirmAction === "disable" ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Management Dialog */}
      <Dialog
        open={!!roleUser}
        onOpenChange={(open) => !open && setRoleUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Manage Roles — {roleUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {ROLES.map((role) => (
              <label
                key={role}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <span>{ROLE_LABELS[role] ?? role}</span>
              </label>
            ))}
          </div>
          {selectedRoles.length === 0 && (
            <p className="text-sm text-destructive">
              User must have at least one role.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={selectedRoles.length === 0 || isPending}
            >
              {isPending ? "Saving..." : "Save Roles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
