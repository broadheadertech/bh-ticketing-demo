// StatBlock.tsx — centered number + uppercase mono label. Ported from the web
// StatBlock + .kbd-rule. Used in the artist stats row and the profile stats.
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type StatBlockProps = {
  n: number | string;
  label: string;
  /** color the number with the accent (e.g. tickets count). */
  accent?: boolean;
  style?: ViewStyle;
};

export function StatBlock({ n, label, accent, style }: StatBlockProps) {
  const { t } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <Text
        style={[
          styles.n,
          { color: accent ? t.accent : t.ink, fontFamily: t.fonts.head },
        ]}
      >
        {n}
      </Text>
      <Text style={[styles.label, { color: t.ink3, fontFamily: t.fonts.mono }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center" },
  n: { fontSize: 19, fontWeight: "800" },
  label: { fontSize: 10, marginTop: 3, letterSpacing: 0.4 },
});
