// Button.tsx — Plaza button. Ported from .btn variants in m-styles.css.
//   variant: "p"   -> primary (accent fill, soft accent shadow)
//            "ink" -> ink fill, paper text
//            "g"   -> ghost (2px ink outline)
//            "soft"-> paper-2 fill
//   size:    "sm" | "md" | "lg"
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type ButtonVariant = "p" | "ink" | "g" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const SIZE = {
  sm: { padV: 9, padH: 14, font: 13, radius: 10 },
  md: { padV: 13, padH: 20, font: 15, radius: 13 },
  lg: { padV: 16, padH: 22, font: 16, radius: 14 },
} as const;

export function Button({
  label,
  variant = "p",
  size = "md",
  block,
  loading,
  left,
  right,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { t } = useTheme();
  const s = SIZE[size];

  let bg = t.accent;
  let fg = t.accentInk;
  let border: ViewStyle = {};
  let shadow: ViewStyle = {};

  if (variant === "p") {
    bg = t.accent;
    fg = t.accentInk;
    shadow = {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 4,
    };
  } else if (variant === "ink") {
    bg = t.ink;
    fg = t.paper;
  } else if (variant === "g") {
    bg = "transparent";
    fg = t.ink;
    border = { borderWidth: 2, borderColor: t.ink };
  } else if (variant === "soft") {
    bg = t.paper2;
    fg = t.ink;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          paddingVertical: s.padV,
          paddingHorizontal: s.padH,
          borderRadius: s.radius,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        border,
        shadow,
        block && styles.block,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {left}
          <Text
            style={[
              styles.label,
              { color: fg, fontSize: s.font, fontFamily: t.fonts.body },
            ]}
          >
            {label}
          </Text>
          {right}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  block: { alignSelf: "stretch", width: "100%" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontWeight: "800" },
});
