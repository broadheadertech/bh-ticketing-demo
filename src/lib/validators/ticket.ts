import { z } from "zod";

const baseRegistrationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  tierSelections: z
    .array(
      z.object({
        tierId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1, "Select at least one ticket")
    .max(10, "Too many tiers selected"),
  buyerEmail: z.string().email("Invalid email"),
});

export const purchaseSchema = baseRegistrationSchema;
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const freeRegistrationSchema = baseRegistrationSchema;
export type FreeRegistrationInput = z.infer<typeof freeRegistrationSchema>;
