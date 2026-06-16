// FactCard.tsx — a small icon + label + value cell used in the event hero's
// facts row (DATE / DOORS / CITY). Ported from m-event.jsx FactCard.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export type FactCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

export function FactCard({ icon, label, value }: FactCardProps) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderRadius: t.radii.md },
        t.shadows.card,
      ]}
    >
      <View style={{ marginBottom: 1 }}>{icon}</View>
      <View>
        <Text style={[styles.label, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          {label.toUpperCase()}
        </Text>
        <Text style={[styles.value, { color: t.ink, fontFamily: t.fonts.head }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, paddingVertical: 12, paddingHorizontal: 13, gap: 7 },
  label: { fontSize: 9.5, letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 13.5, fontWeight: "800", lineHeight: 16 },
});
