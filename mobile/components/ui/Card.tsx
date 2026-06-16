// Card.tsx — soft Plaza surface (.card): card bg, rounded, soft shadow.
import React from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderRadius: t.radii.md,
          padding: padded ? t.pad : 0,
        },
        t.shadows.card,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
