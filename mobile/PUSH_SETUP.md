# Push notifications — setup & the Convex side (server) to add later

The mobile app already does the **client** half of push:

- `lib/push.ts` — requests OS permission, mints the **Expo push token**
  (`ExponentPushToken[...]`), sets the Android channel, and exposes
  `<NotificationsProvider>`.
- `app/_layout.tsx` — wraps the app in `<NotificationsProvider>` (inside the
  Convex + Clerk providers), so registration runs once the user is signed in and
  taps deep-link to `event/[id]` / `ticket/[id]`.

What is **not** built yet is the **server** half: storing tokens in Convex and
actually sending pushes via the Expo Push API. This file is the spec for that.

> Scope note: the steps below are intentionally **not** implemented in this
> change set. They edit the shared root `convex/` backend, which the mobile work
> deliberately leaves untouched. Implement them in a separate backend task.

---

## 0. Prerequisites (client)

1. Install the two native deps the client needs (see "Dependencies" at the
   bottom) and run `pnpm install` in `mobile/`.
2. Add an EAS `projectId` so a token can be minted on a real build. Either run
   `eas init` (writes `extra.eas.projectId` into `app.json`) or add it manually:

   ```jsonc
   // mobile/app.json -> expo
   "extra": { "eas": { "projectId": "your-eas-project-id" } }
   ```

3. iOS requires a real device + an APNs key configured in EAS credentials;
   Android requires an FCM server key in EAS. Simulators never receive push.

The client uploads the token by calling `api.push.savePushToken` **if it
exists** (resolved dynamically in `lib/push.ts` so the app compiles before the
backend lands). Add the function below and it starts working automatically.

---

## 1. Schema — a `pushTokens` table

Add to `convex/schema.ts` (do **not** modify the existing `notifications` table —
we reuse it as-is):

```ts
pushTokens: defineTable({
  userId: v.id("users"),
  token: v.string(),            // "ExponentPushToken[...]"
  platform: v.string(),         // "ios" | "android"
  deviceName: v.optional(v.string()),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_token", ["token"]), // dedupe / upsert per device
```

One user can have many devices; `by_token` lets us upsert a single device
instead of duplicating rows on every launch.

---

## 2. Mutation — `savePushToken` (called by the client)

`convex/push.ts`:

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

export const savePushToken = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    const patch = {
      userId: user._id,
      token: args.token,
      platform: args.platform,
      deviceName: args.deviceName,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("pushTokens", patch);
    }
  },
});
```

This is the function `lib/push.ts` looks up as `api.push.savePushToken`.
The arg names (`token`, `platform`, `deviceName`) must match what the client
sends.

Optional: a `removePushToken` mutation to call on sign-out so a shared device
stops receiving a previous user's pushes.

---

## 3. Sending — an action that calls the Expo Push API

Pushes are sent from a Convex **action** (it needs `fetch`, which queries /
mutations can't do). Drive it from wherever the app already inserts a row into
the `notifications` table (the in-app bell): after the insert, schedule this
action so the bell and the push stay in sync.

`convex/push.ts` (continued):

```ts
"use node"; // only if you split actions into their own file; otherwise omit

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Fan a single notification out to all of a user's device tokens.
export const sendPushToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    // mirror notifications.entityType / entityId so the client can deep-link
    data: v.optional(
      v.object({
        entityType: v.optional(v.string()),
        entityId: v.optional(v.string()),
        type: v.optional(v.string()),
        url: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.runQuery(internal.push.tokensForUser, {
      userId: args.userId,
    });
    if (tokens.length === 0) return;

    // Expo accepts an array of up to 100 messages per request.
    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data ?? {},
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const receipts = await res.json();

    // Prune tokens Expo reports as DeviceNotRegistered.
    // (Inspect receipts.data[i].details.error and call removePushToken.)
    return receipts;
  },
});
```

Add the helper query it calls:

```ts
import { internalQuery } from "./_generated/server";

export const tokensForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => r.token);
  },
});
```

---

## 4. Wire it to the existing `notifications` insert

Wherever the backend currently does
`ctx.db.insert("notifications", {...})`, schedule the push right after so the
in-app bell and the device push are one event:

```ts
const notifId = await ctx.db.insert("notifications", {
  userId, type, title, message, entityType, entityId, read: false,
  createdAt: Date.now(),
});

await ctx.scheduler.runAfter(0, internal.push.sendPushToUser, {
  userId,
  title,
  body: message,
  data: { entityType, entityId, type },
});
```

Because `data.entityType` / `data.entityId` match the client's
`routeFromNotificationData()` in `lib/push.ts`, tapping the push opens
`/event/<id>` or `/ticket/<id>` automatically — no extra mapping needed.

---

## 5. Token lifecycle notes

- **Refresh:** the client re-uploads on every signed-in launch (upsert via
  `by_token`), so rotated tokens self-heal.
- **Sign-out:** add `removePushToken` and call it before `signOut()` on shared
  devices.
- **Pruning:** delete tokens for which Expo returns `DeviceNotRegistered` in the
  push receipt (step 3).
- **Receipts:** for production, poll
  `https://exp.host/--/api/v2/push/getReceipts` with the receipt ids to confirm
  delivery and catch errors asynchronously.

---

## Dependencies

The client needs these two Expo packages. `expo-notifications` is already in
`mobile/package.json`; **add `expo-device`**:

```bash
cd mobile
npx expo install expo-device   # expo-notifications already present
```

`expo-device` is used by `lib/push.ts` to skip registration on simulators
(`Device.isDevice`) and to report a friendly `deviceName`.

No new server packages are required — the Expo Push API is plain `fetch`.
