import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
      return new Response("Server configuration error", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: { type: string; data: Record<string, unknown> };

    try {
      evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof evt;
    } catch (err) {
      console.error("Clerk webhook verification failed:", err);
      return new Response("Verification failed", { status: 400 });
    }

    const data = evt.data as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      email_addresses?: Array<{ email_address: string }>;
      image_url?: string | null;
    };

    if (evt.type === "user.created") {
      const name =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || "User";
      const email = data.email_addresses?.[0]?.email_address ?? "";
      const image = data.image_url ?? undefined;
      await ctx.runMutation(internal.users.createUser, {
        clerkId: data.id!,
        name,
        email,
        image,
      });
    }

    if (evt.type === "user.updated") {
      const name =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || "User";
      const email = data.email_addresses?.[0]?.email_address ?? "";
      const image = data.image_url ?? undefined;
      await ctx.runMutation(internal.users.updateUser, {
        clerkId: data.id!,
        name,
        email,
        image,
      });
    }

    if (evt.type === "user.deleted") {
      if (data.id) {
        await ctx.runMutation(internal.users.deleteUser, {
          clerkId: data.id,
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
