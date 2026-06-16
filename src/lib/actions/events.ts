"use server";

// Server Actions for event operations that require external service calls
// (email notifications). Event mutations that require Clerk auth must be
// called directly via useMutation on the client, then paired with these
// Server Actions for side effects.
//
// Note: "use server" files may only export async functions, so this wraps
// the email helper instead of re-exporting it.

import { sendEventCancellation as sendEventCancellationEmail } from "@/lib/actions/email";

export async function sendEventCancellation(
  ...args: Parameters<typeof sendEventCancellationEmail>
): Promise<Awaited<ReturnType<typeof sendEventCancellationEmail>>> {
  return sendEventCancellationEmail(...args);
}
