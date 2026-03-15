/**
 * Extract user data from Clerk webhook event payload.
 */
export function extractUserFromClerkEvent(data: {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: Array<{ email_address: string }>;
  image_url?: string | null;
}) {
  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ") || "User";
  const email = data.email_addresses?.[0]?.email_address ?? "";
  const image = data.image_url ?? undefined;

  return { clerkId: data.id, name, email, image };
}
