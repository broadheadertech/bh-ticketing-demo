// PayMethod.tsx — selectable payment-method row. Ported from PayMethod in
// m-buy.jsx. A pressed/selected row wears a 2px accent border + filled radio.
// NOTE: the actual charge is handled server-side by Stripe Checkout; these chips
// only express the buyer's preference (Stripe Checkout shows all wallet options).
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type PayMethodProps = {
  id: string;
  label: string;
  sub: string;
  on: boolean;
  onPress: () => void;
};

export function PayMethod({ label, sub, on, onPress }: PayMethodProps) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: t.card,
          borderRadius: t.radii.md,
          borderColor: on ? t.accent : "transparent",
        },
        t.shadows.card,
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.brand, { borderColor: t.line }]}>
          <Text style={[styles.brandText, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            {label.slice(0, 4).toUpperCase()}
          </Text>
        </View>
        <View style={styles.labels}>
          <Text style={[styles.label, { color: t.ink, fontFamily: t.fonts.body }]}>{label}</Text>
          <Text style={[styles.sub, { color: t.ink3, fontFamily: t.fonts.body }]}>{sub}</Text>
        </View>
      </View>
      <View
        style={[
          styles.radio,
          on
            ? { borderWidth: 6, borderColor: t.accent }
            : { borderWidth: 2, borderColor: t.line2 },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 2,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  brand: {
    width: 40,
    height: 28,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 8, fontWeight: "700" },
  labels: { flex: 1 },
  label: { fontSize: 14, fontWeight: "800" },
  sub: { fontSize: 11.5, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 999 },
});
