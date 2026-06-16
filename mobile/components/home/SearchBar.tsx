// SearchBar.tsx — the faux search field that routes to the Browse tab. Ported
// from the .m-search button in m-home.jsx (it is a button, not a live input —
// tapping it hands off to Browse where the real search lives).
import { Search, SlidersHorizontal } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function SearchBar({ onPress }: { onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.bar, { backgroundColor: t.card, borderColor: t.line }]}
      accessibilityRole="search"
    >
      <Search color={t.ink2} size={18} />
      <Text style={[styles.text, { color: t.ink3, fontFamily: t.fonts.body }]} numberOfLines={1}>
        Search events, artists, places…
      </Text>
      <SlidersHorizontal color={t.ink2} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  text: { flex: 1, fontSize: 14, fontWeight: "600" },
});
