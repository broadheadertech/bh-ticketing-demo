"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/custom/role-guard";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { ArrowLeft, GraduationCap, ExternalLink } from "lucide-react";

// Local date string (yyyy-mm-dd) for <input type="date"> from a ms timestamp.
function toDateInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

type Row = {
  ticketId: Id<"tickets">;
  buyerEmail: string;
  tierName: string;
  scannedAt?: number;
  refundStatus?: string;
  certificate: {
    _id: Id<"certificates">;
    certNumber: string;
    attendeeName: string;
    completionDate: number;
  } | null;
};

function AttendeeRow({ row }: { row: Row }) {
  const issue = useMutation(api.certificates.issue);
  const revoke = useMutation(api.certificates.revoke);
  const [name, setName] = useState(
    row.certificate?.attendeeName ?? nameFromEmail(row.buyerEmail)
  );
  const [date, setDate] = useState(
    toDateInput(row.certificate?.completionDate ?? Date.now())
  );
  const [busy, setBusy] = useState(false);

  const cert = row.certificate;

  async function handleIssue() {
    setBusy(true);
    try {
      await issue({
        ticketId: row.ticketId,
        attendeeName: name,
        completionDate: new Date(date).getTime(),
      });
      showSuccess(cert ? "Certificate updated" : "Certificate issued");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!cert) return;
    setBusy(true);
    try {
      await revoke({ certificateId: cert._id });
      showSuccess("Certificate revoked");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{row.buyerEmail}</p>
            <p className="text-xs text-muted-foreground">
              {row.tierName}
              {row.scannedAt ? " · Checked in" : ""}
            </p>
          </div>
          {cert ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {cert.certNumber}
            </Badge>
          ) : (
            <Badge variant="outline">Not issued</Badge>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Attendee name (as printed)"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sm:w-44"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleIssue} disabled={busy || !name.trim()}>
            {cert ? "Update certificate" : "Issue certificate"}
          </Button>
          {cert && (
            <>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/certificate/${cert._id}`} target="_blank">
                  View <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={handleRevoke}
                disabled={busy}
              >
                Revoke
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CertificatesPage() {
  const params = useParams();
  const eventId = params.eventId as Id<"events">;
  const rows = useQuery(api.certificates.listForEvent, { eventId });

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Certificates of Completion</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Issue a certificate to each attendee who completed the program. They can download a
          printable copy from their tickets, and anyone can verify it by its number.
        </p>

        {rows === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            No attendees yet. Certificates can be issued once people have tickets.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <AttendeeRow key={String(row.ticketId)} row={row as Row} />
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
