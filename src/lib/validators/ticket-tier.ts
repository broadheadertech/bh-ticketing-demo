import { z } from "zod";
import { MAX_TIERS_PER_EVENT } from "@/lib/utils/constants";

export const ticketTierSchema = z.object({
  name: z.string().trim().min(1, "Tier name is required").max(100, "Tier name must be 100 characters or less"),
  price: z
    .number({ error: "Price must be a number" })
    .int("Price must be a whole number (centavos)")
    .min(0, "Price cannot be negative"),
  quantity: z
    .number({ error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().or(z.literal("")),
});

export type TicketTierFormData = z.infer<typeof ticketTierSchema>;

export const createTicketTiersSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  tiers: z
    .array(ticketTierSchema)
    .min(1, "At least one ticket tier is required")
    .max(MAX_TIERS_PER_EVENT, `Maximum ${MAX_TIERS_PER_EVENT} tiers per event`),
});

export type CreateTicketTiersFormData = z.infer<typeof createTicketTiersSchema>;
