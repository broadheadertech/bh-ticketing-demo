// TierRow.tsx — one ticket tier row in the event detail preview. Ported from the
// tier card in m-event.jsx. Real data: price is CENTAVOS, availability is
// quantity - soldCount. Sold-out rows dim; low stock shows a "N left" warning.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Money } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";

export type TierRowProps = {
  name: string;
  description?: string | null;
  price: number; // centavos
  available: number; // quantity - soldCount
  /** dot color — usually the event accent / a rotating palette. */
  dotColor: string;
};

const LOW_STOCK = 40;

export function TierRow({
  name,
  description,
  price,
  available,
  dotColor,
}: TierRowProps) {
  const { t } = useTheme();
  const soldOut = available <= 0;
  const low = !soldOut && available <= LOW_STOCK;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderRadius: t.radii.md, opacity: soldOut ? 0.55 : 1 },
        t.shadows.card,
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.flex}>
          <Text style={[styles.name, { color: t.ink, fontFamily: t.fonts.body }]}>
            {name}
          </Text>
          {description ? (
            <Text
              numberOfLines={1}
              style={[styles.desc, { color: t.ink3, fontFamily: t.fonts.body }]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {soldOut ? (
          <Text style={[styles.soldout, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            Sold out
          </Text>
        ) : (
          <Money
            centavos={price}
            style={[styles.price, { color: t.accent, fontFamily: t.fonts.mono }]}
          />
        )}
        {low ? (
          <Text style={[styles.left2, { color: t.mango, fontFamily: t.fonts.body }]}>
            {available} left
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 11, flex: 1 },
  flex: { flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  name: { fontSize: 14.5, fontWeight: "800" },
  desc: { fontSize: 12, marginTop: 2 },
  right: { alignItems: "flex-end" },
  price: { fontWeight: "700", fontSize: 14.5 },
  soldout: { fontWeight: "700", fontSize: 13 },
  left2: { fontSize: 10.5, fontWeight: "800", marginTop: 2 },
});
