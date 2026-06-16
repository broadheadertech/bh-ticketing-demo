// Money.tsx — renders a centavos amount as ₱ via lib/format. Pass `whole` to
// drop decimals (compact poster price tags).
import React from "react";
import { Text, type TextProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { money, moneyWhole } from "../../lib/format";

export type MoneyProps = TextProps & {
  /** amount in CENTAVOS (integer). */
  centavos: number;
  whole?: boolean;
};

export function Money({ centavos, whole, style, ...rest }: MoneyProps) {
  const { t } = useTheme();
  return (
    <Text
      style={[{ color: t.ink, fontFamily: t.fonts.body, fontWeight: "800" }, style]}
      {...rest}
    >
      {whole ? moneyWhole(centavos) : money(centavos)}
    </Text>
  );
}
