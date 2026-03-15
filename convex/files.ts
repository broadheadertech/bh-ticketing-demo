import { mutation } from "./_generated/server";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    return await ctx.storage.generateUploadUrl();
  },
});
