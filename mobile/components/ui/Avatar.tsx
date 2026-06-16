// Avatar.tsx — Plaza conic-ish avatar. RN/SVG has no conic-gradient, so we
// approximate the .avatar look with a multi-stop diagonal sweep tinted from an
// optional `hue` (matches the web ArtistAv hue rotation). Ink border, circle.
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";

export type AvatarProps = {
  size?: number;
  /** hue 0-360; rotates the 4-stop palette like the web conic avatar. */
  hue?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
};

// HSL helper -> hex-ish string RN accepts.
function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360}, ${s}%, ${l}%)`;
}

export function Avatar({ size = 60, hue = 260, style, children }: AvatarProps) {
  const { t } = useTheme();
  const stops = [
    hsl(hue, 70, 62),
    hsl(hue + 45, 65, 66),
    hsl(hue + 180, 64, 56),
    hsl(hue + 250, 60, 62),
    hsl(hue, 70, 62),
  ];
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, borderColor: t.ink },
        style,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="av" x1="0" y1="0" x2="1" y2="1">
            {stops.map((c, i) => (
              <Stop key={i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#av)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
