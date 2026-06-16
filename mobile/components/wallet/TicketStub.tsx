// TicketStub.tsx — wallet list row. A hard-bordered ticket with a themed
// gradient banner up top, a dashed perforation with side notches, and a footer
// carrying the tier + status. Ported from TicketStub in m-tickets.jsx.
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Calendar, ChevronRight, MapPin } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { themeForEvent } from "@/theme/events";
import { formatDate } from "@/lib/format";
import { Tag } from "@/components/ui";
import { isPastTicket, type MyTicket } from "./types";

export function TicketStub({
  tk,
  onPress,
}: {
  tk: MyTicket;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const past = isPastTicket(tk);
  const ev = themeForEvent({
    theme: tk.eventTheme,
    eventType: tk.eventType ?? undefined,
  });
  const stops = ev.grad;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.hard,
          borderRadius: t.radii.md,
          shadowColor: t.hard,
          opacity: past ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {/* themed banner */}
      <View style={styles.banner}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`stub-${tk._id}`} x1="0" y1="0" x2="1" y2="1">
              {stops.map((c, i) => (
                <Stop
                  key={i}
                  offset={`${(i / Math.max(1, stops.length - 1)) * 100}%`}
                  stopColor={c}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#stub-${tk._id})`} />
        </Svg>
        <View style={styles.bannerRow}>
          {/* mini poster chip */}
          <View style={styles.miniPoster}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`mini-${tk._id}`} x1="0" y1="0" x2="1" y2="1">
                  {stops.map((c, i) => (
                    <Stop
                      key={i}
                      offset={`${(i / Math.max(1, stops.length - 1)) * 100}%`}
                      stopColor={c}
                    />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#mini-${tk._id})`} />
            </Svg>
          </View>

          <View style={styles.bannerText}>
            <Text style={styles.title} numberOfLines={1}>
              {tk.eventTitle}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Calendar size={12} color="#fff" />
                <Text style={styles.meta}>
                  {tk.eventDate > 0 ? formatDate(tk.eventDate) : "TBA"}
                </Text>
              </View>
              {!!tk.venueName && (
                <View style={styles.metaItem}>
                  <MapPin size={12} color="#fff" />
                  <Text style={styles.meta} numberOfLines={1}>
                    {tk.venueName}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {!past && (
            <Tag label="1×" bg="#fff" fg={t.ink} style={styles.qtyTag} />
          )}
        </View>
      </View>

      {/* perforation */}
      <View style={[styles.perf, { borderTopColor: t.line2 }]}>
        <View
          style={[
            styles.notch,
            styles.notchLeft,
            { backgroundColor: t.paper, borderColor: t.hard },
          ]}
        />
        <View
          style={[
            styles.notch,
            styles.notchRight,
            { backgroundColor: t.paper, borderColor: t.hard },
          ]}
        />
      </View>

      {/* footer */}
      <View style={styles.foot}>
        <View style={styles.grow}>
          <Text style={[styles.kbd, { color: t.ink3 }]}>
            {tk.tierName.toUpperCase()}
          </Text>
          <Text style={[styles.footVal, { color: t.ink }]}>1 ticket</Text>
        </View>
        {past ? (
          <View style={[styles.usedPill, { borderColor: t.line }]}>
            <Text style={[styles.usedText, { color: t.ink2 }]}>
              {tk.scannedAt ? "Used" : "Ended"}
            </Text>
          </View>
        ) : (
          <View style={styles.viewQr}>
            <Text style={[styles.viewQrText, { color: t.accent }]}>View QR</Text>
            <ChevronRight size={15} color={t.accent} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  banner: {
    padding: 12,
    overflow: "hidden",
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  miniPoster: {
    width: 50,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  bannerText: { flex: 1 },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 160 },
  meta: { color: "#fff", fontSize: 11.5, fontWeight: "700", opacity: 0.96 },
  qtyTag: { alignSelf: "flex-start" },
  perf: {
    height: 0,
    borderTopWidth: 2,
    borderStyle: "dashed",
  },
  notch: {
    position: "absolute",
    top: -11,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
  },
  notchLeft: { left: -11, borderLeftWidth: 0, borderTopWidth: 0 },
  notchRight: { right: -11, borderRightWidth: 0, borderTopWidth: 0 },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  grow: { flex: 1 },
  kbd: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  footVal: { fontSize: 13, fontWeight: "800", marginTop: 3 },
  usedPill: {
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  usedText: { fontSize: 12, fontWeight: "800" },
  viewQr: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewQrText: { fontSize: 12.5, fontWeight: "800" },
});
