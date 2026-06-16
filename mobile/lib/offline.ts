// offline.ts — offline wallet cache so tickets + their QR keep working at the
// gate with no signal.
//
// WHY: the QR value (tk.qrCode) is a plain pre-signed string — nothing has to be
// recomputed online — so once a ticket has been fetched while connected, the
// whole keepsake (QR included) can render fully from cache offline.
//
// HOW: useOfflineTickets() wraps the live convex `tickets:getMyTickets` query.
// Every time the query resolves with fresh data we persist it to AsyncStorage,
// keyed per Clerk user. While the query is `undefined` (cold start, no signal,
// auth still loading) we transparently serve the last good cache so the wallet
// screens never go blank when offline.
//
// STORAGE CHOICE: AsyncStorage (not expo-secure-store) because the full ticket
// list with long signed QR strings easily exceeds SecureStore's ~2KB-per-key
// Android limit, and these tickets are not secrets — the QR is shown on screen
// at the gate anyway. AsyncStorage gives ample capacity for the wallet payload.
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/convex";
import type { MyTicket } from "@/components/wallet";

const KEY_PREFIX = "phlive:wallet:tickets:";
const ANON_KEY = `${KEY_PREFIX}anon`;

/** Per-user cache key so one device can hold separate wallets per account. */
function cacheKey(userId?: string | null): string {
  return userId ? `${KEY_PREFIX}${userId}` : ANON_KEY;
}

/** Persist the freshly-fetched ticket list for offline use. Best-effort. */
export async function saveTicketsToCache(
  userId: string | null | undefined,
  tickets: MyTicket[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(tickets));
  } catch {
    // ignore — cache is a nicety, never block the UI on it
  }
}

/** Read the last-known ticket list from disk. Returns null if none/corrupt. */
export async function loadTicketsFromCache(
  userId: string | null | undefined,
): Promise<MyTicket[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MyTicket[]) : null;
  } catch {
    return null;
  }
}

/** Forget a user's cached wallet (e.g. on sign-out). Best-effort. */
export async function clearTicketsCache(
  userId: string | null | undefined,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(userId));
  } catch {
    // ignore
  }
}

export type OfflineTicketsResult = {
  /** Tickets to render: live data when available, otherwise the cache. */
  tickets: MyTicket[] | undefined;
  /** True while we have neither live data nor a loaded cache yet. */
  loading: boolean;
  /** True when what's shown came from disk, not a live fetch this session. */
  fromCache: boolean;
};

/**
 * Live-or-cache ticket source for the wallet screens.
 *
 * - Runs the authed convex query (skips when signed out).
 * - On every successful live result, writes it to AsyncStorage.
 * - Until live data arrives, hydrates from the cache so the wallet/QR work
 *   offline. Once live data lands it takes over and refreshes the cache.
 */
export function useOfflineTickets(): OfflineTicketsResult {
  const { isSignedIn, userId } = useAuth();

  const live = useQuery(
    api.tickets.getMyTickets,
    isSignedIn ? {} : "skip",
  ) as MyTicket[] | undefined;

  const [cached, setCached] = useState<MyTicket[] | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  // Hydrate from disk once per user as soon as the screen mounts, so the first
  // paint can show tickets even with no connection.
  useEffect(() => {
    let alive = true;
    setCacheChecked(false);
    loadTicketsFromCache(userId)
      .then((c) => {
        if (alive) setCached(c);
      })
      .finally(() => {
        if (alive) setCacheChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  // Whenever live data resolves, persist it and adopt it as the cache too.
  const lastSaved = useRef<MyTicket[] | undefined>(undefined);
  useEffect(() => {
    if (live === undefined) return;
    if (lastSaved.current === live) return;
    lastSaved.current = live;
    setCached(live);
    void saveTicketsToCache(userId, live);
  }, [live, userId]);

  if (live !== undefined) {
    return { tickets: live, loading: false, fromCache: false };
  }

  // No live data yet: serve cache if we have it.
  if (cached) {
    return { tickets: cached, loading: false, fromCache: true };
  }

  // No live data and no cache: loading until the cache lookup has finished,
  // then genuinely empty (undefined tickets, not loading).
  return { tickets: undefined, loading: !cacheChecked, fromCache: false };
}
