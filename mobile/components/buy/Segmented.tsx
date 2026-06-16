// Segmented.tsx — two-option segmented control (General / Reserved). Ported from
// the .seg in m-buy.jsx.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type SegmentedProps = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

export function Segmented({ options, value, onChange }: SegmentedProps) {
  const { t } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.paper2, borderRadius: t.radii.pill }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[
              styles.seg,
              { borderRadius: t.radii.pill },
              on && { backgroundColor: t.ink },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: on ? t.paper : t.ink2, fontFamily: t.fonts.body },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", padding: 4, gap: 4 },
  seg: { flex: 1, alignItems: "center", paddingVertical: 9 },
  label: { fontSize: 13, fontWeight: "800" },
});
