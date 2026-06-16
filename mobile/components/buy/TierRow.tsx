// TierRow.tsx — one GA ticket tier card with name, description, price, an
// availability line and a quantity stepper. Ported from the GA card in
// m-buy.jsx. Money is centavos straight from Convex.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, Money } from "../ui";
import { useTheme } from "../../theme/ThemeProvider";
import { Stepper } from "./Stepper";
import type { Doc } from "../../lib/convex";

export type TierRowProps = {
  tier: Doc<"ticketTiers">;
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  /** true when the global per-order cap (8) is reached. */
  capReached?: boolean;
  /** event accent used for the tier dot / "only N left" tint. */
  accent: string;
};

const LOW_STOCK = 40;

export function TierRow({ tier, qty, onMinus, onPlus, capReached, accent }: TierRowProps) {
  const { t } = useTheme();
  const left = Math.max(0, tier.quantity - tier.soldCount);
  const soldOut = left <= 0;
  const low = left <= LOW_STOCK;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.nameWrap}>
          <View style={[styles.dot, { backgroundColor: soldOut ? t.line2 : accent }]} />
          <View style={styles.nameText}>
            <Text style={[styles.name, { color: t.ink, fontFamily: t.fonts.body }]} numberOfLines={1}>
              {tier.name}
            </Text>
            {!!tier.description && (
              <Text style={[styles.desc, { color: t.ink3, fontFamily: t.fonts.body }]} numberOfLines={2}>
                {tier.description}
              </Text>
            )}
          </View>
        </View>
        <Money centavos={tier.price} style={[styles.price, { fontFamily: t.fonts.mono }]} />
      </View>

      <View style={styles.bottomRow}>
        <Text
          style={[
            styles.avail,
            { color: soldOut ? t.ink3 : low ? t.mango : t.ink3, fontFamily: t.fonts.body },
          ]}
        >
          {soldOut ? "Sold out" : low ? `Only ${left} left` : "Available"}
        </Text>
        {soldOut ? (
          <Text style={[styles.soldTag, { color: t.ink3, fontFamily: t.fonts.mono }]}>—</Text>
        ) : (
          <Stepper n={qty} onMinus={onMinus} onPlus={onPlus} capReached={capReached} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 15 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  nameWrap: { flexDirection: "row", gap: 11, flex: 1, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 5 },
  nameText: { flex: 1 },
  name: { fontSize: 15, fontWeight: "800" },
  desc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  price: { fontSize: 15, fontWeight: "700" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },
  avail: { fontSize: 11.5, fontWeight: "800" },
  soldTag: { fontSize: 13 },
});
