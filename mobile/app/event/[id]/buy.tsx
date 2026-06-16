// app/event/[id]/buy.tsx — ticket selection. GA tier quantity pickers + a simple
// reserved-seat picker, with a sticky "Continue" CTA that forwards the order to
// the checkout screen. Ported from SeatmapScreen in m-buy.jsx.
//
// Backend: api.ticketTiers.getPublicTiersByEventId + api.events.getPublicEventById
// (both args-by eventId). Money is centavos straight from Convex.
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { api, type Id } from "../../../lib/convex";
import { useTheme } from "../../../theme/ThemeProvider";
import { themeForEvent } from "../../../theme/events";
import { Button, Card, Placeholder } from "../../../components/ui";
import { money } from "../../../lib/format";
import { Segmented } from "../../../components/buy/Segmented";
import { TierRow } from "../../../components/buy/TierRow";
import { SeatMap, buildSeats, type Seat } from "../../../components/buy/SeatMap";
import type { Order, OrderLine } from "../../../components/buy/order";

const MAX_PER_ORDER = 8;

export default function BuyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as Id<"events">;
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const event = useQuery(api.events.getPublicEventById, { eventId });
  const tiers = useQuery(api.ticketTiers.getPublicTiersByEventId, { eventId });

  const [mode, setMode] = useState<"general" | "seated">("general");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<string[]>([]);

  const ev = themeForEvent(event ?? {});

  // base price (cheapest tier) drives the deterministic seat layout
  const basePrice = useMemo(() => {
    if (!tiers || tiers.length === 0) return 80000;
    return Math.min(...tiers.map((x) => x.price));
  }, [tiers]);
  const rows = useMemo(() => buildSeats(basePrice), [basePrice]);
  const seatById = useMemo(() => {
    const m: Record<string, Seat> = {};
    rows.forEach((r) => r.seats.forEach((se) => (m[se.id] = se)));
    return m;
  }, [rows]);

  const gaCount = Object.values(qty).reduce((a, n) => a + n, 0);

  const order: Order = useMemo(() => {
    if (mode === "general") {
      const lines: OrderLine[] = (tiers ?? [])
        .map((tier) => ({ tier, n: qty[tier._id] ?? 0 }))
        .filter((x) => x.n > 0)
        .map(({ tier, n }) => ({
          tierId: tier._id,
          name: tier.name,
          price: tier.price,
          qty: n,
        }));
      return { type: "ga", lines, subtotal: lines.reduce((a, l) => a + l.price * l.qty, 0) };
    }
    const lines: OrderLine[] = picked.map((sid) => {
      const se = seatById[sid];
      return {
        name: `Seat ${se.id}${se.vip ? " · VIP" : ""}`,
        price: se.price,
        qty: 1,
        seat: se.id,
      };
    });
    return { type: "seated", lines, subtotal: lines.reduce((a, l) => a + l.price, 0) };
  }, [mode, tiers, qty, picked, seatById]);

  const count = mode === "general" ? gaCount : picked.length;
  const capReached = count >= MAX_PER_ORDER;

  const toggleSeat = (id: string) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PER_ORDER ? p : [...p, id]
    );

  const onContinue = () => {
    if (count === 0) return;
    router.push({
      pathname: "/checkout/[id]",
      params: { id: eventId, order: JSON.stringify(order) },
    });
  };

  const loading = event === undefined || tiers === undefined;

  return (
    <View style={[styles.fill, { backgroundColor: t.paper }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* header */}
      <View style={{ paddingTop: insets.top, backgroundColor: t.paper }}>
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.iconBtn, { borderColor: t.line }]}
          >
            <ChevronLeft size={20} color={t.ink} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: t.ink, fontFamily: t.fonts.head }]}>
              Choose tickets
            </Text>
            {!!event?.title && (
              <Text style={[styles.subtitle, { color: t.ink3, fontFamily: t.fonts.body }]} numberOfLines={1}>
                {event.title}
              </Text>
            )}
          </View>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.segWrap}>
          <Segmented
            options={[
              { value: "general", label: "General admission" },
              { value: "seated", label: "Reserved seats" },
            ]}
            value={mode}
            onChange={(v) => setMode(v as "general" | "seated")}
          />
        </View>
      </View>

      {/* body */}
      <View style={styles.body}>
        {loading ? (
          <View style={{ gap: 11 }}>
            <Placeholder height={88} label="loading tiers" />
            <Placeholder height={88} />
            <Placeholder height={88} />
          </View>
        ) : mode === "general" ? (
          (tiers ?? []).length === 0 ? (
            <Card style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
                No tickets yet
              </Text>
              <Text style={[styles.emptyBody, { color: t.ink3, fontFamily: t.fonts.body }]}>
                Tickets for this event aren&apos;t on sale right now.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 11 }}>
              {tiers!.map((tier) => (
                <TierRow
                  key={tier._id}
                  tier={tier}
                  qty={qty[tier._id] ?? 0}
                  accent={ev.primary}
                  capReached={capReached}
                  onMinus={() =>
                    setQty((q) => ({ ...q, [tier._id]: Math.max(0, (q[tier._id] ?? 0) - 1) }))
                  }
                  onPlus={() =>
                    setQty((q) =>
                      gaCount >= MAX_PER_ORDER ? q : { ...q, [tier._id]: (q[tier._id] ?? 0) + 1 }
                    )
                  }
                />
              ))}
              <Text style={[styles.note, { color: t.ink3, fontFamily: t.fonts.body }]}>
                Max {MAX_PER_ORDER} tickets per order. Re-entry allowed with a valid wristband.
              </Text>
            </View>
          )
        ) : (
          <View>
            <SeatMap rows={rows} picked={picked} onToggle={toggleSeat} primary={ev.primary} />
            {picked.length > 0 && (
              <Card style={styles.seatsCard}>
                <Text style={[styles.kbd, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                  YOUR SEATS · {picked.length}
                </Text>
                <View style={styles.seatChips}>
                  {picked.map((sid) => {
                    const se = seatById[sid];
                    return (
                      <Pressable
                        key={sid}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove seat ${sid}`}
                        onPress={() => toggleSeat(sid)}
                        style={[styles.seatChip, { borderColor: ev.primary, borderRadius: t.radii.pill }]}
                      >
                        <Text style={[styles.seatChipText, { color: t.ink, fontFamily: t.fonts.body }]}>
                          {sid}
                          {se.vip ? " · VIP" : ""} · {money(se.price)} ✕
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            )}
          </View>
        )}
      </View>

      {/* sticky CTA */}
      <View
        style={[
          styles.cta,
          { backgroundColor: t.card, borderTopColor: t.line, paddingBottom: insets.bottom + 14 },
        ]}
      >
        <View>
          <Text style={[styles.kbd, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            {count} TICKET{count !== 1 ? "S" : ""}
          </Text>
          <Text style={[styles.ctaTotal, { color: t.ink, fontFamily: t.fonts.head }]}>
            {money(order.subtotal)}
          </Text>
        </View>
        <Button
          label="Continue"
          size="lg"
          disabled={count === 0}
          onPress={onContinue}
          right={<ChevronRight size={18} strokeWidth={2.2} color={t.accentInk} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 11.5, marginTop: 1 },
  segWrap: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 2 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  empty: { padding: 22, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptyBody: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  seatsCard: { padding: 13, marginTop: 16 },
  kbd: { fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  seatChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  seatChip: { borderWidth: 1.5, paddingVertical: 6, paddingHorizontal: 11 },
  seatChipText: { fontSize: 12, fontWeight: "700" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  ctaTotal: { fontSize: 22, fontWeight: "800" },
});
