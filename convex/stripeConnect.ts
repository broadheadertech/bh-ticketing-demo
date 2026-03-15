import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

export const saveStripeAccountId = mutation({
  args: { stripeAccountId: v.string() },
  handler: async (ctx, args) => {
    if (!args.stripeAccountId.startsWith("acct_")) {
      throw new ConvexError("Invalid Stripe account ID format");
    }
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, ["artist", "organization"]);
    await ctx.db.patch(user._id, { stripeAccountId: args.stripeAccountId });
  },
});
