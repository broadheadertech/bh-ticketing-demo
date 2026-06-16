// Chip.tsx — toggleable filter chip with ink outline; fills ink when `on`.
// Ported from .chip / .chip.on.
import React from "react";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type ChipProps = {
  label: string;
  on?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, on, onPress, style }: ChipProps) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: t.ink,
          backgroundColor: on ? t.ink : "transparent",
          borderRadius: t.radii.pill,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: on ? t.paper : t.ink, fontFamily: t.fonts.body },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: "flex-start",
  },
  label: { fontSize: 13.5, fontWeight: "700" },
});
