import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { verifySignature, type QrPayload } from "@/lib/qr/signing";

export type ScanResponse =
  | { status: "valid"; buyerEmail: string; tierId: string; tierName: string }
  | { status: "already_scanned"; scannedAt: number }
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
    let body: { qrCode?: unknown; eventId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ status: "error", message: "Invalid request body" }, { status: 400 });
    }

    const qrCode = typeof body.qrCode === "string" ? body.qrCode : null;
    const eventId = typeof body.eventId === "string" ? body.eventId : null;
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

    // 7. Check duplicate scan
    if (ticket.scannedAt !== undefined) {
      return NextResponse.json({ status: "already_scanned", scannedAt: ticket.scannedAt });
    }

    // 8. Get scanner email and mark ticket as scanned
    const clerkUser = await clerkClient().users.getUser(userId);
    const scannerEmail = clerkUser.emailAddresses[0]?.emailAddress ?? userId;

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
