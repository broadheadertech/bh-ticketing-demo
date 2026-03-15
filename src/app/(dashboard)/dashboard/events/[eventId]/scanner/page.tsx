"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ScannerLayout } from "@/components/layouts/scanner-layout";
import { EntryCounter } from "@/components/custom/entry-counter";
import type { ScanResponse } from "@/app/api/scan/route";
import { formatDateTime } from "@/lib/utils/format";

const QrScanner = dynamic(
  () => import("@/components/custom/qr-scanner").then((m) => ({ default: m.QrScanner })),
  { ssr: false, loading: () => <Skeleton className="w-full max-w-sm h-64 mx-auto" /> }
);

export default function ScannerPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;

  const scanAccess = useQuery(api.staff.canScanEvent, { eventId });

  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-reset result after 4 seconds
  useEffect(() => {
    if (!scanResult) return;
    const timer = setTimeout(() => setScanResult(null), 4000);
    return () => clearTimeout(timer);
  }, [scanResult]);

  async function handleScan(qrCode: string) {
    if (!qrCode) return; // M2 fix: guard empty strings (Story notes: qrCode="" if QR generation failed)
    if (isProcessing) return;
    setScanResult(null); // L1 fix: clear previous result immediately when new scan fires
    setIsProcessing(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode, eventId }),
      });
      const data: ScanResponse = await res.json();
      setScanResult(data);
    } catch {
      setScanResult({ status: "error", message: "Network error" });
    } finally {
      setIsProcessing(false);
    }
  }

  // Loading state
  if (scanAccess === undefined) {
    return (
      <ScannerLayout title="Loading...">
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          <Skeleton className="w-full max-w-sm h-64" />
          <Skeleton className="w-48 h-6" />
        </div>
      </ScannerLayout>
    );
  }

  // Authorization check: creator OR assigned staff
  if (!scanAccess.authorized) {
    return (
      <ScannerLayout title="Scanner">
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-6 max-w-sm w-full">
            <p className="text-destructive font-semibold text-lg">Unauthorized</p>
            <p className="text-muted-foreground text-sm mt-1">
              You are not assigned to scan this event.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Back to dashboard
          </Link>
        </div>
      </ScannerLayout>
    );
  }

  return (
    <ScannerLayout title={scanAccess.eventTitle}>
      <div className="flex flex-col items-center gap-4 p-4">
        {/* Back link */}
        <div className="w-full max-w-sm">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            ← Back to event
          </Link>
        </div>

        {/* Scanner */}
        <QrScanner onScan={handleScan} paused={isProcessing} />

        {/* Result overlay */}
        {scanResult && <ScanResultCard result={scanResult} />}

        {isProcessing && !scanResult && (
          <p className="text-sm text-muted-foreground">Verifying ticket...</p>
        )}

        {/* Entry counter — real-time via Convex reactive subscription */}
        <EntryCounter eventId={eventId} />
      </div>
    </ScannerLayout>
  );
}

function ScanResultCard({ result }: { result: ScanResponse }) {
  const isValid = result.status === "valid";
  const baseClass = "rounded-lg border p-4 max-w-sm w-full text-center";
  const colorClass = isValid
    ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700"
    : "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700";

  return (
    <div className={`${baseClass} ${colorClass}`}>
      {result.status === "valid" && (
        <>
          <p className="text-green-700 dark:text-green-300 font-bold text-xl">Valid Ticket</p>
          <p className="text-sm mt-1">{result.buyerEmail}</p>
          <p className="text-xs text-muted-foreground mt-1">Tier: {result.tierName}</p>
        </>
      )}
      {result.status === "already_scanned" && (
        <>
          <p className="text-red-700 dark:text-red-300 font-bold text-xl">Already Scanned</p>
          <p className="text-sm mt-1 text-muted-foreground">
            Scanned at: {formatDateTime(result.scannedAt)}
          </p>
        </>
      )}
      {result.status === "invalid_signature" && (
        <p className="text-red-700 dark:text-red-300 font-bold text-xl">Invalid Ticket</p>
      )}
      {result.status === "wrong_event" && (
        <p className="text-red-700 dark:text-red-300 font-bold text-xl">Wrong Event</p>
      )}
      {result.status === "not_found" && (
        <p className="text-red-700 dark:text-red-300 font-bold text-xl">Ticket Not Found</p>
      )}
      {result.status === "error" && (
        <>
          <p className="text-red-700 dark:text-red-300 font-bold text-xl">Error</p>
          <p className="text-sm mt-1 text-muted-foreground">{result.message}</p>
        </>
      )}
    </div>
  );
}
