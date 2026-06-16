// Tag.tsx — tiny uppercase status tag. Ported from .tag. Pass bg/fg to tint
// (e.g. theme accent for "ON SALE", green for "FREE").
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type TagProps = {
  label: string;
  bg?: string;
  fg?: string;
  left?: React.ReactNode;
  style?: ViewStyle;
};

export function Tag({ label, bg, fg, left, style }: TagProps) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: bg ?? t.paper2, borderRadius: 6 },
        style,
      ]}
    >
      {left}
      <Text
        style={[styles.label, { color: fg ?? t.ink, fontFamily: t.fonts.body }]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
});
