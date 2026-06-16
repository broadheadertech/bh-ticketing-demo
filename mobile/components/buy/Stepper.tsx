// Stepper.tsx — quantity +/- control for a GA tier. Ported from the .stepper in
// m-buy.jsx. Ink-outlined pill with a mono count in the middle.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type StepperProps = {
  n: number;
  onMinus: () => void;
  onPlus: () => void;
  /** disable + when the order already holds `max` items. */
  max?: number;
  /** true when the global per-order cap is hit (greys out +). */
  capReached?: boolean;
};

export function Stepper({ n, onMinus, onPlus, max = 8, capReached }: StepperProps) {
  const { t } = useTheme();
  const minusDisabled = n <= 0;
  const plusDisabled = n >= max || !!capReached;

  return (
    <View style={[styles.wrap, { borderColor: t.line2, borderRadius: t.radii.pill }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove one"
        disabled={minusDisabled}
        onPress={onMinus}
        style={[styles.btn, { opacity: minusDisabled ? 0.35 : 1 }]}
        hitSlop={6}
      >
        <Minus size={16} strokeWidth={2.4} color={t.ink} />
      </Pressable>
      <Text style={[styles.n, { color: t.ink, fontFamily: t.fonts.mono }]}>{n}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add one"
        disabled={plusDisabled}
        onPress={onPlus}
        style={[styles.btn, { opacity: plusDisabled ? 0.35 : 1 }]}
        hitSlop={6}
      >
        <Plus size={16} strokeWidth={2.4} color={t.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  btn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  n: { minWidth: 24, textAlign: "center", fontSize: 15, fontWeight: "700" },
});
