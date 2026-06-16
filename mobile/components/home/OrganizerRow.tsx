// OrganizerRow.tsx — verified-organizer style list card. Ported from the "Top
// organizers" block in m-home.jsx (logo tile + name + verified shield + meta +
// chevron). No public organizer query is in scope for the home feed, so the
// parent feeds these from event-derived groupings (one per event type, with a
// live count) to keep the section meaningful and data-backed.
import { ChevronRight, ShieldCheck } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { themeForEvent } from "@/theme/events";
import { useTheme } from "@/theme/ThemeProvider";

export function OrganizerRow({
  name,
  meta,
  eventType,
  verified = true,
  onPress,
}: {
  name: string;
  meta: string;
  /** used only to tint the logo tile with that world's primary color. */
  eventType: string;
  verified?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTheme();
  const tint = themeForEvent({ eventType }).primary;

  return (
    <Pressable onPress={onPress}>
      <Card padded={false} style={styles.card}>
        <View style={[styles.logo, { backgroundColor: tint, borderColor: t.ink }]}>
          <Text style={[styles.logoText, { fontFamily: t.fonts.head }]}>
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: t.ink, fontFamily: t.fonts.head }]} numberOfLines={1}>
              {name}
            </Text>
            {verified ? <ShieldCheck color={t.blue} size={14} /> : null}
          </View>
          <Text style={[styles.meta, { color: t.ink3, fontFamily: t.fonts.body }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <ChevronRight color={t.ink3} size={18} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 11, gap: 12 },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  body: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  meta: { fontSize: 11.5, fontWeight: "600" },
});
