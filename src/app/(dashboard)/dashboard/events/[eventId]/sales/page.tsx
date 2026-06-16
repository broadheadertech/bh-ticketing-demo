"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { formatCurrency } from "@/lib/utils/format";
import { EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import { getStatusBadgeVariant } from "@/lib/utils/event-status";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/utils/toast-helpers";
import { refundSingleTicket } from "@/lib/actions/partial-refund";
import { ArrowLeft, DollarSign, Ticket, Users, Package, RotateCcw } from "lucide-react";
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

export default function EventSalesPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;
  const data = useQuery(api.events.getEventSalesData, { eventId });

  useEffect(() => {
    if (data) {
      document.title = `${data.event.title} - Sales | TIX.PH`;
    }
  }, [data]);

  if (data === undefined) {
    return (
      <RoleGuard requiredRoles={["artist", "organization"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </RoleGuard>
    );
  }

  const statusConfig = getStatusBadgeVariant(data.event.status);

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {data.event.title} — Sales
          </h1>
          <Badge
            variant={statusConfig.variant}
            className={cn(statusConfig.className)}
          >
            {EVENT_STATUS_LABELS[data.event.status] ?? data.event.status}
          </Badge>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Ticket className="h-5 w-5" />}
            label="Total Tickets Sold"
            value={data.totals.totalTicketsSold}
          />
          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Total Revenue"
            value={formatCurrency(data.totals.totalRevenue)}
          />
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="Total Capacity"
            value={data.totals.totalCapacity}
          />
          <MetricCard
            icon={<Package className="h-5 w-5" />}
            label="Tickets Remaining"
            value={data.totals.totalRemaining}
            subtitle="across all tiers"
          />
        </div>

        {/* Tier Breakdown */}
        {data.tiers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">
                No ticket tiers configured yet
              </h3>
              <p className="text-muted-foreground mt-1">
                Configure ticket tiers to start tracking sales
              </p>
              {data.event.status === "draft" && (
                <Button asChild className="mt-4">
                  <Link href={`/dashboard/events/${eventId}/tickets`}>
                    Configure Tickets
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">
                Per-Tier Breakdown
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tiers.map((tier) => (
                    <TableRow key={tier._id}>
                      <TableCell className="font-medium">
                        {tier.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tier.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.soldCount} / {tier.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.remaining}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(tier.tierRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Individual Tickets */}
        <TicketListWithRefund eventId={eventId} eventTitle={data.event.title} />
      </div>
    </RoleGuard>
  );
}

function TicketListWithRefund({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const tickets = useQuery(api.tickets.getEventTicketsForCreator, {
    eventId: eventId as never,
  });
  const [refundTarget, setRefundTarget] = useState<{
    ticketId: string;
    buyerEmail: string;
    tierName: string;
    tierPrice: number;
  } | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  async function handleRefund() {
    if (!refundTarget) return;
    setIsRefunding(true);
    try {
      const result = await refundSingleTicket(refundTarget.ticketId, eventTitle);
      if (result.success) {
        showSuccess("Ticket refunded");
      } else {
        showError(result.error ?? "Refund failed");
      }
    } catch {
      showError("Refund failed");
    } finally {
      setIsRefunding(false);
      setRefundTarget(null);
    }
  }

  if (!tickets || tickets.length === 0) return null;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">
            Individual Tickets ({tickets.length})
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket._id}>
                  <TableCell className="text-sm">{ticket.buyerEmail}</TableCell>
                  <TableCell>{ticket.tierName}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(ticket.tierPrice)}
                  </TableCell>
                  <TableCell>
                    {ticket.refundStatus === "refunded" ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Refunded
                      </Badge>
                    ) : ticket.refundStatus === "failed" ? (
                      <Badge variant="destructive">Failed</Badge>
                    ) : ticket.scannedAt ? (
                      <Badge variant="outline">Scanned</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!ticket.refundStatus && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setRefundTarget({
                            ticketId: ticket._id,
                            buyerEmail: ticket.buyerEmail,
                            tierName: ticket.tierName,
                            tierPrice: ticket.tierPrice,
                          })
                        }
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!refundTarget}
        onOpenChange={(open) => !open && setRefundTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Refund <strong>{refundTarget?.tierName}</strong> ticket for{" "}
              <strong>{refundTarget?.buyerEmail}</strong>?
              {refundTarget && refundTarget.tierPrice > 0 && (
                <> Amount: <strong>{formatCurrency(refundTarget.tierPrice)}</strong></>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRefunding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} disabled={isRefunding}>
              {isRefunding ? "Refunding..." : "Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
