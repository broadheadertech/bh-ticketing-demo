"use server";

// Server Actions for event operations that require external service calls
// (email notifications). Event mutations that require Clerk auth must be
// called directly via useMutation on the client, then paired with these
// Server Actions for side effects.

export { sendEventCancellation } from "@/lib/actions/email";
