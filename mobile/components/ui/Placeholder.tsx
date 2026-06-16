// Placeholder.tsx — striped image drop-zone with an optional mono caption.
// Ported from .ph / .ph .cap. Uses an SVG diagonal stripe pattern since RN has
// no repeating-linear-gradient.
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";

export type PlaceholderProps = {
  height?: number;
  label?: string;
  rounded?: number;
  style?: ViewStyle;
};

export function Placeholder({
  height = 160,
  label = "image",
  rounded,
  style,
}: PlaceholderProps) {
  const { t } = useTheme();
  const radius = rounded ?? t.radii.md;
  // ~6% ink stripe on paper-2
  const stripe = t.mode === "dark" ? "rgba(246,238,223,0.06)" : "rgba(23,18,12,0.06)";

  return (
    <View
      style={[
        styles.wrap,
        { height, borderRadius: radius, backgroundColor: t.paper2 },
        style,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="stripe"
            patternUnits="userSpaceOnUse"
            width={18}
            height={18}
            patternTransform="rotate(45)"
          >
            <Line x1="0" y1="0" x2="0" y2="18" stroke={stripe} strokeWidth={9} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#stripe)" />
      </Svg>
      {label ? (
        <Text style={[styles.cap, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          {label.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  cap: { fontSize: 10, letterSpacing: 0.4 },
});
