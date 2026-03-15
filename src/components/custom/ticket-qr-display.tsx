"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  /** JSON payload string stored in tickets.qrCode — passed directly to QRCode.toDataURL() */
  qrCode: string;
  /** Convex ticket _id — used to derive the human-readable text code */
  ticketId: string;
};

/** Formats first 8 chars of Convex ticket ID as a readable code: e.g. "JX7A-BC12" */
export function formatTextCode(ticketId: string): string {
  const code = ticketId.slice(0, 8).toUpperCase();
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

export function TicketQrDisplay({ qrCode, ticketId }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [fullscreen, setFullscreen] = useState(false);

  // Generate QR data URL client-side only (useEffect = safe for SSR)
  useEffect(() => {
    if (!qrCode) return;
    QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: "M",
      width: 200,
      margin: 2,
    })
      .then(setDataUrl)
      .catch((err) => console.error("QR code render failed:", err));
  }, [qrCode]);

  // Attempt to prevent screen from sleeping while showing full-screen QR
  useEffect(() => {
    if (!fullscreen) return;
    let wakeLock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      (navigator.wakeLock as WakeLock)
        .request("screen")
        .then((lock) => {
          wakeLock = lock;
        })
        .catch(() => {
          // WakeLock not available in all browsers/contexts — silent fail is fine
        });
    }
    return () => {
      wakeLock?.release().catch(() => {});
    };
  }, [fullscreen]);

  const textCode = formatTextCode(ticketId);

  if (!dataUrl) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[200px] w-[200px]" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="focus:outline-none focus:ring-2 focus:ring-ring rounded self-start"
          aria-label="Open full-screen QR code"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="Ticket QR code — tap to enlarge"
            width={200}
            height={200}
          />
        </button>
        <p
          className="text-xs font-mono text-muted-foreground"
          aria-label={`Ticket code: ${textCode}`}
        >
          {textCode}
        </p>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your Ticket QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="Ticket QR code full size"
              width={300}
              height={300}
            />
            <p
              className="text-sm font-mono text-muted-foreground"
              aria-label={`Ticket code: ${textCode}`}
            >
              {textCode}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Show this QR code at the event entrance
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
