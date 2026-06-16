// Segmented.tsx — Upcoming / Past pill toggle. Ported from .seg in m-styles.css.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
}) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.seg,
        { backgroundColor: t.paper2, borderColor: t.line, borderRadius: 12 },
      ]}
    >
      {options.map((opt) => {
        const on = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.item,
              on && {
                backgroundColor: t.card,
                shadowColor: t.hard,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: on ? t.ink : t.ink3, fontFamily: t.fonts.body },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
  },
  label: { fontSize: 13.5, fontWeight: "800" },
});
