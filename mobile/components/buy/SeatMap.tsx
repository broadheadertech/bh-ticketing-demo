// SeatMap.tsx — a simple reserved-seat picker UI. Ported from buildSeats + the
// seat grid in m-buy.jsx. This is a CLIENT-ONLY visual map (the backend has no
// per-seat inventory yet), so "taken" seats are generated deterministically from
// the event's base price so the same event always shows the same layout.
//
// All money values are CENTAVOS (integers), consistent with Convex.
import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type Seat = {
  id: string;
  row: string;
  n: number;
  taken: boolean;
  vip: boolean;
  price: number; // centavos
};

export type SeatRow = { row: string; vip: boolean; price: number; seats: Seat[] };

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = 14;
const AISLE_AFTER = 7;

/** Deterministic seat layout from a base centavos price (mirrors buildSeats). */
export function buildSeats(basePriceCentavos: number): SeatRow[] {
  const from = basePriceCentavos || 80000; // ₱800 default
  let s = (from / 100) * 31; // seed off the peso amount (parity with web)
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >>> 8) / 0x7fffff;
  };
  const r50 = (n: number) => Math.round(n / 5000) * 5000; // round to nearest ₱50 (centavos)
  return ROWS.map((r, ri) => {
    const vip = ri < 2;
    const price = vip ? r50(from * 2.4) : ri < 5 ? r50(from * 1.4) : from;
    return {
      row: r,
      vip,
      price,
      seats: Array.from({ length: COLS }).map((_, ci) => ({
        id: r + (ci + 1),
        row: r,
        n: ci + 1,
        taken: rnd() > 0.74,
        vip,
        price,
      })),
    };
  });
}

export type SeatMapProps = {
  rows: SeatRow[];
  picked: string[];
  onToggle: (id: string) => void;
  /** event primary color for selected seats. */
  primary: string;
};

export function SeatMap({ rows, picked, onToggle, primary }: SeatMapProps) {
  const { t } = useTheme();
  const vipBg = t.mode === "dark" ? "#4A3A12" : "#FFE9B0";

  const seatColor = (se: Seat, sel: boolean) => {
    if (se.taken) return { bg: t.line2, border: t.line2 };
    if (sel) return { bg: primary, border: primary };
    if (se.vip) return { bg: vipBg, border: t.ink };
    return { bg: t.card, border: t.ink };
  };

  return (
    <View>
      {/* stage */}
      <View style={[styles.stage, { backgroundColor: t.ink }]}>
        <Text style={[styles.stageText, { color: t.paper, fontFamily: t.fonts.mono }]}>STAGE</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScroll}
      >
        <View style={styles.grid}>
          {rows.map((r) => (
            <View key={r.row} style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                {r.row}
              </Text>
              {r.seats.map((se) => {
                const sel = picked.includes(se.id);
                const c = seatColor(se, sel);
                return (
                  <Pressable
                    key={se.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Seat ${se.id}${se.vip ? " VIP" : ""}${se.taken ? " taken" : sel ? " selected" : ""}`}
                    disabled={se.taken}
                    onPress={() => onToggle(se.id)}
                    style={[
                      styles.seat,
                      {
                        backgroundColor: c.bg,
                        borderColor: c.border,
                        marginRight: se.n === AISLE_AFTER ? 12 : 4,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* legend */}
      <View style={styles.legend}>
        {[
          { label: "Available", bg: t.card, border: t.ink },
          { label: "VIP", bg: vipBg, border: t.ink },
          { label: "Selected", bg: primary, border: primary },
          { label: "Taken", bg: t.line2, border: t.line2 },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: l.bg, borderColor: l.border }]} />
            <Text style={[styles.legendLabel, { color: t.ink, fontFamily: t.fonts.body }]}>
              {l.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stageText: { fontSize: 11, letterSpacing: 5, fontWeight: "700" },
  gridScroll: { paddingHorizontal: 4, alignSelf: "center" },
  grid: { gap: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowLabel: { width: 14, fontSize: 10 },
  seat: { width: 20, height: 18, borderRadius: 4, borderWidth: 1.5 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 16,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 14, height: 13, borderRadius: 4, borderWidth: 1.5 },
  legendLabel: { fontSize: 11.5, fontWeight: "700" },
});
