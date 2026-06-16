import type { Metadata } from "next";
import { CreateEventWizard } from "@/components/custom/create-event-wizard";
import { RoleGuard } from "@/components/custom/role-guard";

export const metadata: Metadata = {
  title: "Create Event | TIX.PH",
};

export default function CreateEventPage() {
  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Create Event</h1>
        <CreateEventWizard />
      </div>
    </RoleGuard>
  );
}
