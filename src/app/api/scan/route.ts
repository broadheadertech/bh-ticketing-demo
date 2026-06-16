import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { verifySignature, type QrPayload } from "@/lib/qr/signing";

export type ScanResponse =
  | { status: "valid"; buyerEmail: string; tierId: string; tierName: string; dayLabel?: string }
  | { status: "already_scanned"; scannedAt: number }
  | { status: "wrong_day"; tierName: string; dayLabel?: string }
  | { status: "refunded" }
  | { status: "invalid_signature" }
  | { status: "wrong_event" }
  | { status: "not_found" }
  | { status: "error"; message: string };

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest): Promise<NextResponse<ScanResponse>> {
  try {
    // 1. Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    let body: { qrCode?: unknown; eventId?: unknown; dayId?: unknown; dayLabel?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ status: "error", message: "Invalid request body" }, { status: 400 });
    }

    const qrCode = typeof body.qrCode === "string" ? body.qrCode : null;
    const eventId = typeof body.eventId === "string" ? body.eventId : null;
    // Per-day check-in: present only for multi-day events; absent = single-day (legacy path).
    const dayId = typeof body.dayId === "string" && body.dayId ? body.dayId : null;
    const dayLabel = typeof body.dayLabel === "string" ? body.dayLabel : undefined;
    if (!qrCode || !eventId) {
      return NextResponse.json({ status: "error", message: "Missing qrCode or eventId" }, { status: 400 });
    }

    // 3. Parse qrCode as QrPayload JSON
    let payload: QrPayload;
    try {
      payload = JSON.parse(qrCode);
    } catch {
      return NextResponse.json({ status: "invalid_signature" });
    }
    if (!payload.ticketId || !payload.eventId || !payload.tierId || !payload.buyerEmail) {
      return NextResponse.json({ status: "invalid_signature" });
    }

    // 4. Fetch ticket from Convex
    const ticket = await convex.query(api.tickets.getTicketByIdForScan, {
      ticketId: payload.ticketId,
      querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
    });
    if (!ticket) {
      return NextResponse.json({ status: "not_found" });
    }

    // 5. Verify HMAC signature
    const signatureValid = verifySignature(qrCode, ticket.qrSignature);
    if (!signatureValid) {
      return NextResponse.json({ status: "invalid_signature" });
    }

    // 6. Check event match
    if (payload.eventId !== eventId) {
      return NextResponse.json({ status: "wrong_event" });
    }

    // 7. Resolve scanner email (needed by both single-day and per-day paths)
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const scannerEmail = clerkUser.emailAddresses[0]?.emailAddress ?? userId;

    // 8a. Per-day check-in (multi-day events): a full pass admits each day once,
    //     a day-pass admits only its own day. Validation + recording is atomic in Convex.
    if (dayId) {
      const result = await convex.mutation(api.tickets.scanTicketForDay, {
        scanSecret: process.env.CONVEX_WEBHOOK_SECRET!,
        ticketId: payload.ticketId,
        dayId,
        scannedBy: scannerEmail,
      });
      switch (result.status) {
        case "valid":
          return NextResponse.json({
            status: "valid",
            buyerEmail: ticket.buyerEmail,
            tierId: ticket.tierId,
            tierName: ticket.tierName,
            dayLabel,
          });
        case "already_scanned":
          return NextResponse.json({ status: "already_scanned", scannedAt: result.scannedAt });
        case "wrong_day":
          return NextResponse.json({ status: "wrong_day", tierName: ticket.tierName, dayLabel });
        case "refunded":
          return NextResponse.json({ status: "refunded" });
        default:
          return NextResponse.json({ status: "not_found" });
      }
    }

    // 8b. Single-day check-in (legacy path): one scan per ticket via tickets.scannedAt.
    if (ticket.scannedAt !== undefined) {
      return NextResponse.json({ status: "already_scanned", scannedAt: ticket.scannedAt });
    }

    await convex.mutation(api.tickets.markTicketScanned, {
      scanSecret: process.env.CONVEX_WEBHOOK_SECRET!,
      ticketId: payload.ticketId,
      scannedBy: scannerEmail,
    });

    // 9. Return success (H1 fix: include tierName for AC#2 "tier name" display requirement)
    return NextResponse.json({
      status: "valid",
      buyerEmail: ticket.buyerEmail,
      tierId: ticket.tierId,
      tierName: ticket.tierName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
