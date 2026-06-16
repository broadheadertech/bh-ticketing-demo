// LeaderboardTable.tsx — public race results table with medal ranks.
// Fed by races:getResultsPublic ({ eventTitle, eventDate, rows[] }). Top-3 ranks
// wear gold/silver/bronze medal badges; the rest show a mono rank/dash. Neutral
// Plaza palette.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Medal } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";

// One row of races:getResultsPublic.rows.
export type ResultRow = {
  bib: string;
  name: string;
  timeText: string;
  rank: number | null;
  note: string;
};

// Shape of races:getResultsPublic.
export type LeaderboardData = {
  eventTitle: string;
  eventDate: number;
  rows: ResultRow[];
};

const MEDAL: Record<number, { bg: string; fg: string }> = {
  1: { bg: "#FFC53D", fg: "#17120C" }, // gold (mango)
  2: { bg: "#C9CAD1", fg: "#17120C" }, // silver
  3: { bg: "#CD8A56", fg: "#17120C" }, // bronze
};

export function LeaderboardTable({ data }: { data: LeaderboardData }) {
  const { t } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.line, borderRadius: t.radii.md },
        t.shadows.card,
      ]}
    >
      {/* column header */}
      <View style={[styles.headRow, { borderBottomColor: t.ink }]}>
        <Text style={[styles.hRank, { color: t.ink3, fontFamily: t.fonts.mono }]}>#</Text>
        <Text style={[styles.hName, { color: t.ink3, fontFamily: t.fonts.mono }]}>ATHLETE</Text>
        <Text style={[styles.hTime, { color: t.ink3, fontFamily: t.fonts.mono }]}>TIME</Text>
      </View>

      {data.rows.map((r, i) => {
        const medal = r.rank != null ? MEDAL[r.rank] : undefined;
        return (
          <View
            key={`${r.bib}-${r.name}-${i}`}
            style={[
              styles.row,
              { borderBottomColor: t.line },
              i === data.rows.length - 1 && styles.lastRow,
            ]}
          >
            {/* rank / medal */}
            <View style={styles.rankCell}>
              {medal ? (
                <View style={[styles.medal, { backgroundColor: medal.bg, borderColor: t.hard }]}>
                  <Medal size={13} color={medal.fg} />
                  <Text style={[styles.medalNum, { color: medal.fg, fontFamily: t.fonts.mono }]}>
                    {r.rank}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.rankNum, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                  {r.rank != null ? r.rank : "—"}
                </Text>
              )}
            </View>

            {/* name + bib + note */}
            <View style={styles.nameCell}>
              <Text
                numberOfLines={1}
                style={[styles.name, { color: t.ink, fontFamily: t.fonts.body }]}
              >
                {r.name || "Unnamed"}
              </Text>
              <Text style={[styles.bib, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                {r.bib ? `BIB ${r.bib}` : "—"}
                {r.note ? ` · ${r.note}` : ""}
              </Text>
            </View>

            {/* time */}
            <Text style={[styles.time, { color: t.ink2, fontFamily: t.fonts.mono }]}>
              {r.timeText || "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    paddingVertical: 10,
  },
  hRank: { width: 44, fontSize: 10.5, letterSpacing: 1, fontWeight: "700" },
  hName: { flex: 1, fontSize: 10.5, letterSpacing: 1, fontWeight: "700" },
  hTime: { fontSize: 10.5, letterSpacing: 1, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  lastRow: { borderBottomWidth: 0 },
  rankCell: { width: 44 },
  medal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 7,
    alignSelf: "flex-start",
  },
  medalNum: { fontSize: 12, fontWeight: "800" },
  rankNum: { fontSize: 15, fontWeight: "700", paddingLeft: 6 },
  nameCell: { flex: 1, paddingRight: 10 },
  name: { fontSize: 15, fontWeight: "800" },
  bib: { fontSize: 11, marginTop: 2 },
  time: { fontSize: 14, fontWeight: "700" },
});
