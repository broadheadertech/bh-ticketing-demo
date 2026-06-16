// SectionHead.tsx — section title with ink underline + optional index + link.
// Ported from .sec-head.
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type SectionHeadProps = {
  title: string;
  /** mono index label, e.g. "01" */
  index?: string;
  linkLabel?: string;
  onPressLink?: () => void;
  style?: ViewStyle;
};

export function SectionHead({
  title,
  index,
  linkLabel,
  onPressLink,
  style,
}: SectionHeadProps) {
  const { t } = useTheme();
  return (
    <View style={[styles.wrap, { borderBottomColor: t.ink }, style]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: t.ink, fontFamily: t.fonts.head }]}>
          {title}
        </Text>
        {index ? (
          <Text style={[styles.idx, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            {index}
          </Text>
        ) : null}
      </View>
      {linkLabel ? (
        <Pressable onPress={onPressLink}>
          <Text style={[styles.link, { color: t.ink2, fontFamily: t.fonts.body }]}>
            {linkLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    borderBottomWidth: 2,
    paddingBottom: 9,
    marginBottom: 14,
  },
  left: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  title: { fontSize: 23, fontWeight: "800", letterSpacing: -0.5 },
  idx: { fontSize: 11, marginBottom: 3 },
  link: { fontSize: 12.5, fontWeight: "800" },
});
