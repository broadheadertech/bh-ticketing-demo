// SearchField.tsx — Plaza search input. Ported from .m-search in m-browse.jsx:
// a line-bordered card pill with a leading search glyph and a clear (x) button
// that appears once there's a query.
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchField({
  value,
  onChangeText,
  placeholder = "Search events, artists, places…",
}: SearchFieldProps) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: t.card,
          borderColor: t.line,
          borderRadius: t.radii.pill,
        },
      ]}
    >
      <Search size={18} color={t.ink3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.ink3}
        returnKeyType="search"
        autoCorrect={false}
        style={[styles.input, { color: t.ink, fontFamily: t.fonts.body }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <X size={17} color={t.ink3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1.5,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "600", padding: 0 },
});
