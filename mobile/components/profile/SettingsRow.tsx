// SettingsRow.tsx — a pressable settings list row. Ported from the web .lrow /
// SettingsRow: leading icon, bold title, optional detail text, trailing chevron.
// Pass `right` to render a control (e.g. a Switch) instead of the chevron.
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type SettingsRowProps = {
  icon: LucideIcon;
  title: string;
  detail?: string;
  onPress?: () => void;
  danger?: boolean;
  /** custom trailing element; replaces the chevron when provided. */
  right?: React.ReactNode;
  /** hide the trailing chevron (e.g. when row is not navigable). */
  noChevron?: boolean;
  /** drop the bottom divider (use on the last row of a card). */
  last?: boolean;
  style?: ViewStyle;
};

export function SettingsRow({
  icon: Icon,
  title,
  detail,
  onPress,
  danger,
  right,
  noChevron,
  last,
  style,
}: SettingsRowProps) {
  const { t } = useTheme();
  const tint = danger ? t.accent : t.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: t.line,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed && onPress ? 0.6 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.ic, { backgroundColor: t.paper2 }]}>
        <Icon size={18} color={tint} />
      </View>
      <Text
        style={[styles.title, { color: tint, fontFamily: t.fonts.body }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {detail ? (
        <Text style={[styles.detail, { color: t.ink3, fontFamily: t.fonts.body }]}>
          {detail}
        </Text>
      ) : null}
      {right ?? (!danger && !noChevron ? <ChevronRight size={17} color={t.ink3} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  ic: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 14.5, fontWeight: "700" },
  detail: { fontSize: 13 },
});
