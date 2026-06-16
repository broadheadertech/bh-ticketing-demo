// ScheduleRow.tsx — one day in a multi-day event's schedule. Backend `days`
// shape: { id, label, date (ms), startTime?, endTime? }.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { formatDate } from "@/lib/format";

export type ScheduleRowProps = {
  label: string;
  date: number; // epoch ms
  startTime?: string | null; // "HH:mm"
  endTime?: string | null; // "HH:mm"
  /** zero-based position in the schedule (for the index badge). */
  index: number;
  accent: string;
};

export function ScheduleRow({
  label,
  date,
  startTime,
  endTime,
  index,
  accent,
}: ScheduleRowProps) {
  const { t } = useTheme();
  const times = [startTime, endTime].filter(Boolean).join(" – ");

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderRadius: t.radii.md },
        t.shadows.card,
      ]}
    >
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Text style={[styles.badgeNum, { fontFamily: t.fonts.head }]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.label, { color: t.ink, fontFamily: t.fonts.body }]}>
          {label}
        </Text>
        <Text style={[styles.meta, { color: t.ink3, fontFamily: t.fonts.body }]}>
          {formatDate(date)}
          {times ? ` · ${times}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNum: { color: "#fff", fontSize: 17, fontWeight: "800" },
  flex: { flex: 1 },
  label: { fontSize: 14.5, fontWeight: "800" },
  meta: { fontSize: 12.5, marginTop: 3 },
});
