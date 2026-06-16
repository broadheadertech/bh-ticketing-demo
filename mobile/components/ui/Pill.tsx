// Pill.tsx — small rounded label with a line border. Ported from .pill.
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type PillProps = {
  label: string;
  left?: React.ReactNode;
  style?: ViewStyle;
};

export function Pill({ label, left, style }: PillProps) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        { borderColor: t.line, backgroundColor: t.card, borderRadius: t.radii.pill },
        style,
      ]}
    >
      {left}
      <Text style={[styles.label, { color: t.ink2, fontFamily: t.fonts.body }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    alignSelf: "flex-start",
  },
  label: { fontSize: 12.5, fontWeight: "700" },
});
