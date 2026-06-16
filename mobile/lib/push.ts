// lib/push.ts — Expo push-notification CLIENT registration + tap routing.
//
// What this file does (CLIENT side only):
//   1. Asks the OS for notification permission.
//   2. Reads the Expo push token (ExponentPushToken[...]) for this device.
//   3. Sets the Android notification channel (required for Android heads-up).
//   4. Provides a <NotificationsProvider> that:
//        - registers on mount once the user is signed in,
//        - pushes the token up to Convex (best-effort; safe no-op until the
//          server mutation exists — see PUSH_SETUP.md),
//        - deep-links to event/ticket screens when a notification is TAPPED,
//        - handles the "cold start from a notification" case.
//
// What this file does NOT do: it never sends a push (that is the Convex action
// described in PUSH_SETUP.md) and never touches the shared root convex/ schema.
//
// Usage: wrap the app once in app/_layout.tsx:
//   import { NotificationsProvider } from "../lib/push";
//   ...<NotificationsProvider>{children}</NotificationsProvider>
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useConvex } from "convex/react";
import type { FunctionReference } from "convex/server";

// Remembers this device's push token so we can unregister it on sign-out
// (so a shared device stops receiving the previous user's pushes).
const TOKEN_KEY = "phlive:push:token";
let currentToken: string | null = null;

// ---------------------------------------------------------------------------
// Foreground presentation: show banner + play sound even while app is open.
// ---------------------------------------------------------------------------
Notifications.setNotificationHandler({
  // expo-notifications (SDK 54): shouldShowAlert was split into
  // shouldShowBanner + shouldShowList. Keep all on so foreground pushes show.
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ANDROID_CHANNEL_ID = "default";

/**
 * The payload we expect inside a notification's `data` field. The Convex action
 * (PUSH_SETUP.md) mirrors the shape of the `notifications` table so the same
 * record drives both the in-app bell and the push tap target.
 */
export type PushData = {
  // Mirrors notifications.entityType / entityId from the Convex schema.
  entityType?: "event" | "ticket" | string;
  entityId?: string;
  // Optional fully-formed deep link; takes precedence over entityType/Id.
  url?: string;
  // Pass-through of notifications.type for analytics / future routing.
  type?: string;
};

// ---------------------------------------------------------------------------
// Permission + token
// ---------------------------------------------------------------------------

/**
 * Request permission and return the Expo push token, or null if unavailable
 * (denied, simulator, or web). Never throws — always resolves.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // Push tokens only exist on physical devices.
  if (!Device.isDevice) {
    if (__DEV__) {
      console.warn("[push] Skipping registration: not a physical device.");
    }
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF7A1A",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    if (__DEV__) console.warn("[push] Permission not granted.");
    return null;
  }

  // EAS project id is required to mint a token in SDK 49+.
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data; // "ExponentPushToken[...]"
  } catch (err) {
    if (__DEV__) console.warn("[push] Failed to get Expo push token:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tap routing
// ---------------------------------------------------------------------------

/**
 * Turn a notification's data payload into an in-app route and navigate.
 * Safe to call with partial/empty data — it simply no-ops if nothing matches.
 */
export function routeFromNotificationData(data: PushData | undefined): void {
  if (!data) return;

  // 1) Explicit URL wins (e.g. "/event/abc123" or a phlive:// deep link).
  if (typeof data.url === "string" && data.url.length > 0) {
    try {
      router.push(data.url as never);
    } catch {
      // ignore malformed urls
    }
    return;
  }

  // 2) entityType + entityId -> known screens (mirror app/ route tree).
  if (!data.entityId) return;
  switch (data.entityType) {
    case "event":
      router.push(`/event/${data.entityId}` as never);
      return;
    case "ticket":
      router.push(`/ticket/${data.entityId}` as never);
      return;
    default:
      // Unknown entity types are ignored rather than crashing.
      return;
  }
}

// ---------------------------------------------------------------------------
// Server upsert (best-effort, schema-free here)
// ---------------------------------------------------------------------------
//
// We reference the future Convex mutation by string path so this file does NOT
// need the codegen to contain it yet. Once you add convex/push.ts with
// `savePushToken` (see PUSH_SETUP.md) and run codegen, this call just works.
// Until then the catch keeps the app silent.
type ConvexClientLike = {
  mutation: (
    ref: FunctionReference<"mutation">,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
};

async function savePushTokenToConvex(
  convex: ConvexClientLike,
  token: string,
): Promise<void> {
  try {
    // The api object is generated; referencing a not-yet-existing function via
    // the typed `api` would fail to compile, so we resolve it dynamically.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { api } = require("./convex") as {
      api: Record<string, Record<string, FunctionReference<"mutation">>>;
    };
    const ref = api?.push?.savePushToken;
    if (!ref) {
      if (__DEV__) {
        console.warn(
          "[push] api.push.savePushToken not found — add convex/push.ts (see PUSH_SETUP.md). Token:",
          token,
        );
      }
      return;
    }
    await convex.mutation(ref, {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? undefined,
    });
  } catch (err) {
    if (__DEV__) console.warn("[push] savePushToken failed (ok for now):", err);
  }
}

/**
 * Unregister this device's token on sign-out so the next user (or signed-out
 * state) doesn't keep receiving the previous account's pushes. Best-effort —
 * call it BEFORE Clerk signOut() so the Convex client is still connected.
 */
export async function unregisterPushToken(
  convex: ConvexClientLike,
): Promise<void> {
  try {
    const token = currentToken ?? (await AsyncStorage.getItem(TOKEN_KEY));
    if (token) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { api } = require("./convex") as {
        api: Record<string, Record<string, FunctionReference<"mutation">>>;
      };
      const ref = api?.push?.removePushToken;
      if (ref) await convex.mutation(ref, { token });
    }
  } catch (err) {
    if (__DEV__) console.warn("[push] unregister failed (ok):", err);
  } finally {
    currentToken = null;
    void AsyncStorage.removeItem(TOKEN_KEY);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Mount once near the root (inside Convex + Clerk + expo-router providers).
 * Registers for push when signed in, wires tap -> deep-link routing, and
 * handles the cold-start-from-notification case.
 */
export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const convex = useConvex();
  const registeredRef = useRef(false);

  // 1) Register for push + upload token (only once, only when signed in).
  useEffect(() => {
    if (!isLoaded || !isSignedIn || registeredRef.current) return;
    registeredRef.current = true;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        currentToken = token;
        void AsyncStorage.setItem(TOKEN_KEY, token);
        await savePushTokenToConvex(convex as ConvexClientLike, token);
      }
    })();
  }, [isLoaded, isSignedIn, convex]);

  // 2) Tap handling (warm app) + cold-start-from-notification.
  useEffect(() => {
    // Warm: user taps a notification while the app is running/background.
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as PushData | undefined;
        routeFromNotificationData(data);
      },
    );

    // Cold: app was launched by tapping a notification.
    let cancelled = false;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response) return;
      const data = response.notification.request.content.data as
        | PushData
        | undefined;
      routeFromNotificationData(data);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return children as React.ReactElement;
}
