// TicketQRCard.tsx — the keepsake ticket on the detail screen. A themed hero up
// top (event title + date/time/venue), a dashed perforation, then a LOCKED white
// validation zone holding the real scannable QR (tk.qrCode) plus tier/status/gate
// stat rule. The QR zone stays neutral white (not event-skinned) so scanners read
// it reliably. Ported from the ticket card in TicketDetailScreen (m-tickets.jsx).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import { Calendar, Clock, MapPin } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { themeForEvent } from "@/theme/events";
import { formatDate } from "@/lib/format";
import { Tag } from "@/components/ui";
import { isPastTicket, type MyTicket } from "./types";

export function TicketQRCard({ tk }: { tk: MyTicket }) {
  const { t } = useTheme();
  const past = isPastTicket(tk);
  const ev = themeForEvent({
    theme: tk.eventTheme,
    eventType: tk.eventType ?? undefined,
  });
  const stops = ev.grad;

  // short, readable code derived from the qrCode payload.
  const shortCode = tk.qrCode.replace(/[^A-Za-z0-9]/g, "").slice(-12).toUpperCase();

  const stats: [string, string][] = [
    ["TIER", tk.tierName],
    ["STATUS", past ? (tk.scannedAt ? "Used" : "Ended") : "Valid"],
    ["GATE", "B"],
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.hard,
          borderRadius: t.radii.md,
          shadowColor: t.hard,
        },
      ]}
    >
      {/* themed hero */}
      <View style={styles.hero}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="qr-hero" x1="0" y1="0" x2="1" y2="1">
              {stops.map((c, i) => (
                <Stop
                  key={i}
                  offset={`${(i / Math.max(1, stops.length - 1)) * 100}%`}
                  stopColor={c}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#qr-hero)" />
        </Svg>
        <View>
          <Tag label={ev.name} bg="rgba(255,255,255,0.92)" fg={t.ink} />
          <Text style={styles.heroTitle} numberOfLines={2}>
            {tk.eventTitle}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.metaItem}>
              <Calendar size={13} color="#fff" />
              <Text style={styles.heroMeta}>
                {tk.eventDate > 0 ? formatDate(tk.eventDate) : "TBA"}
              </Text>
            </View>
            {!!tk.eventTime && (
              <View style={styles.metaItem}>
                <Clock size={13} color="#fff" />
                <Text style={styles.heroMeta}>{tk.eventTime}</Text>
              </View>
            )}
          </View>
          {!!tk.venueName && (
            <View style={[styles.metaItem, { marginTop: 6 }]}>
              <MapPin size={13} color="#fff" />
              <Text style={styles.heroMeta} numberOfLines={1}>
                {tk.venueName}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* perforation */}
      <View style={[styles.perf, { borderTopColor: t.line2 }]}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: t.paper }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: t.paper }]} />
      </View>

      {/* LOCKED white validation zone — neutral so the QR scans cleanly */}
      <View style={styles.zone}>
        <View style={styles.qrBox}>
          <QRCode
            value={tk.qrCode}
            size={172}
            color="#17120C"
            backgroundColor="#FFFFFF"
            quietZone={8}
          />
        </View>
        <Text style={styles.code}>{shortCode}</Text>

        <View style={[styles.statRule, { borderTopColor: "#E4D9C5" }]}>
          {stats.map(([k, v]) => (
            <View key={k} style={styles.stat}>
              <Text style={styles.statKbd}>{k}</Text>
              <Text style={styles.statVal} numberOfLines={1}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  hero: { padding: 16, overflow: "hidden" },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 10,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 9 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 240 },
  heroMeta: { color: "#fff", fontSize: 12.5, fontWeight: "700", opacity: 0.96 },
  perf: { height: 0, borderTopWidth: 2, borderStyle: "dashed" },
  notch: {
    position: "absolute",
    top: -12,
    width: 22,
    height: 22,
    borderRadius: 999,
  },
  notchLeft: { left: -12 },
  notchRight: { right: -12 },
  // Locked validation zone is intentionally hard-coded white/ink (never skinned).
  zone: {
    alignItems: "center",
    gap: 14,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  qrBox: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  code: {
    fontFamily: "SpaceMono",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: "#17120C",
  },
  statRule: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    borderTopWidth: 1.5,
    paddingTop: 14,
  },
  stat: { alignItems: "center", flex: 1 },
  statKbd: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#8A8073" },
  statVal: { fontSize: 13.5, fontWeight: "800", marginTop: 3, color: "#17120C" },
});
