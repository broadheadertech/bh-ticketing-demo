"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/custom/role-guard";
import { formatDate } from "@/lib/utils/format";
import { EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import { Shield, ScanLine } from "lucide-react";

export default function StaffAssignmentsPage() {
  return (
    <RoleGuard requiredRoles={["staff"]}>
      <StaffAssignmentsContent />
    </RoleGuard>
  );
}

function StaffAssignmentsContent() {
  const assignments = useQuery(api.staff.getMyAssignments);

  if (assignments === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Assignments</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Assignments</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No assignments yet</h2>
          <p className="text-muted-foreground max-w-sm">
            You have not been assigned to any events. Event creators can assign
            you as staff to scan tickets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">My Assignments</h1>
        <Badge variant="secondary">{assignments.length}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment.eventId}>
            <CardHeader>
              <CardTitle className="text-base leading-snug">
                {assignment.eventTitle}
              </CardTitle>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {assignment.eventDate > 0 && (
                  <p>{formatDate(assignment.eventDate)}</p>
                )}
                {assignment.eventTime && <p>{assignment.eventTime}</p>}
              </div>
              <Badge variant="outline" className="w-fit text-xs">
                {EVENT_STATUS_LABELS[assignment.eventStatus] ?? assignment.eventStatus}
              </Badge>
            </CardHeader>
            <CardContent>
              <Button size="sm" asChild>
                <Link href={`/scanner?eventId=${assignment.eventId}`}>
                  <ScanLine className="h-4 w-4 mr-1" />
                  Open Scanner
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
