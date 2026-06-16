// HomeHeader.tsx — the Plaza top bar for the home feed. Ported from the .m-head
// region of m-home.jsx: TIX.PH wordmark on the left, a location pill + a bell
// (with unread dot) on the right. Sits above the scroll content.
import { Bell, ChevronDown, MapPin } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function HomeHeader({
  city = "All cities",
  hasUnread = false,
  onPressBell,
  onPressCity,
}: {
  city?: string;
  hasUnread?: boolean;
  onPressBell?: () => void;
  onPressCity?: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.bar}>
      <View style={styles.logo}>
        <View style={[styles.logoDot, { backgroundColor: t.accent, borderColor: t.ink }]} />
        <Text style={[styles.logoText, { color: t.ink, fontFamily: t.fonts.head }]}>
          TIX<Text style={{ color: t.accent }}>.PH</Text>
        </Text>
      </View>

      <View style={styles.right}>
        <Pressable
          onPress={onPressCity}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Choose city"
          style={[styles.pill, { borderColor: t.line, backgroundColor: t.card }]}
        >
          <MapPin color={t.ink2} size={13} />
          <Text style={[styles.pillText, { color: t.ink2, fontFamily: t.fonts.body }]}>
            {city}
          </Text>
          <ChevronDown color={t.ink2} size={12} />
        </Pressable>

        <Pressable
          onPress={onPressBell}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Bell color={t.ink} size={21} />
          {hasUnread ? (
            <View style={[styles.dot, { backgroundColor: t.accent, borderColor: t.paper }]} />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  logo: { flexDirection: "row", alignItems: "center", gap: 7 },
  logoDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
  logoText: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  pillText: { fontSize: 12.5, fontWeight: "700" },
  iconBtn: { padding: 6 },
  dot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
