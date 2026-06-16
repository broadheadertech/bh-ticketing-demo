// Browse tab — search field, category/city/sort filters, a 2-up results grid of
// poster cards, and an empty state. Ported from m-browse.jsx.
//
// Data source: api.events.listPublicEvents (args-less, reactive). All filtering
// (text, category, city, sort) happens client-side over that list so we can
// match the multi-field search (title / venue / city / category) shown in the
// mock — the backend searchPublicEvents only matches titles. "From" prices come
// from api.ticketTiers.getPriceRangeByEventIds (centavos), enabling the price
// tag on cards and the Price ↑/↓ sorts.
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { Search } from "lucide-react-native";

import { api } from "@/lib/convex";
import { useTheme } from "@/theme/ThemeProvider";
import { Screen, Button, Pill, Chip } from "@/components/ui";
import { GridPoster, SearchField, SelectPill } from "@/components/browse";

// Display label -> backend eventType. "All" means no filter.
const CATEGORIES: { label: string; type: string | null }[] = [
  { label: "All", type: null },
  { label: "Concerts", type: "concert" },
  { label: "Racing", type: "racing" },
  { label: "Seminars", type: "seminar" },
  { label: "Classes", type: "class" },
  { label: "Other", type: "other" },
];

const SORTS = ["Soonest", "Price ↑", "Price ↓"] as const;
const POPULAR = ["Aurora", "Drift", "Cosplay", "Beach", "OPM"];

export default function BrowseScreen() {
  const { t } = useTheme();
  const events = useQuery(api.events.listPublicEvents);

  const eventIds = useMemo(
    () => (events ? events.map((e) => e._id as string) : []),
    [events],
  );
  const prices = useQuery(
    api.ticketTiers.getPriceRangeByEventIds,
    events ? { eventIds } : "skip",
  );

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [city, setCity] = useState("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Soonest");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const loading = events === undefined;

  // Cities present in the data, for the city selector.
  const cities = useMemo(() => {
    const set = new Set<string>();
    (events ?? []).forEach((e) => {
      if (e.city) set.add(e.city);
    });
    return ["All", ...Array.from(set).sort()];
  }, [events]);

  const catType = CATEGORIES.find((c) => c.label === cat)?.type ?? null;

  const fromOf = (id: string) => prices?.[id]?.minPrice ?? null;

  const list = useMemo(() => {
    let out = (events ?? []).filter((e) => {
      const okCat = !catType || e.eventType === catType;
      const okCity = city === "All" || e.city === city;
      const ql = q.trim().toLowerCase();
      const okQ =
        !ql ||
        e.title.toLowerCase().includes(ql) ||
        (e.venueName ?? "").toLowerCase().includes(ql) ||
        (e.city ?? "").toLowerCase().includes(ql) ||
        e.eventType.toLowerCase().includes(ql);
      return okCat && okCity && okQ;
    });
    // Backend already returns date-asc. Re-sort per the chosen control; events
    // with no priced tier sort last on price sorts.
    if (sort === "Soonest") out = [...out].sort((a, b) => a.date - b.date);
    else if (sort === "Price ↑")
      out = [...out].sort(
        (a, b) =>
          (prices?.[a._id]?.minPrice ?? Infinity) -
          (prices?.[b._id]?.minPrice ?? Infinity),
      );
    else if (sort === "Price ↓")
      out = [...out].sort(
        (a, b) =>
          (prices?.[b._id]?.minPrice ?? -Infinity) -
          (prices?.[a._id]?.minPrice ?? -Infinity),
      );
    return out;
  }, [events, catType, city, q, sort, prices]);

  const showPopular = q.trim() === "" && cat === "All";

  const clearFilters = () => {
    setQ("");
    setCat("All");
    setCity("All");
  };

  return (
    <Screen>
      {/* Header */}
      <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>
        Browse
      </Text>

      <View style={styles.searchWrap}>
        <SearchField value={q} onChangeText={setQ} />
      </View>

      {/* Category chips */}
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.label}
            label={c.label}
            on={c.label === cat}
            onPress={() => setCat(c.label)}
          />
        ))}
      </View>

      {/* Popular searches */}
      {showPopular ? (
        <View style={styles.popular}>
          <Text style={[styles.rule, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            POPULAR SEARCHES
          </Text>
          <View style={styles.pills}>
            {POPULAR.map((p) => (
              <Pressable key={p} onPress={() => setQ(p)}>
                <Pill label={p} left={<Search size={12} color={t.ink3} />} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <Text style={[styles.count, { color: t.ink, fontFamily: t.fonts.head }]}>
          {loading
            ? "Loading…"
            : `${list.length} result${list.length !== 1 ? "s" : ""}`}
        </Text>
        <View style={styles.selectors}>
          <SelectPill value={city} options={cities} onChange={setCity} />
          <SelectPill
            value={sort}
            options={[...SORTS]}
            onChange={(v) => setSort(v as (typeof SORTS)[number])}
          />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Search size={34} color={t.ink3} />
          <Text style={[styles.emptyTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
            No events found
          </Text>
          <Text style={[styles.emptyBody, { color: t.ink3, fontFamily: t.fonts.body }]}>
            Try a different search or clear your filters.
          </Text>
          <Button label="Clear filters" variant="soft" size="sm" onPress={clearFilters} />
        </View>
      ) : (
        <View style={styles.grid}>
          {list.map((ev) => (
            <View key={ev._id} style={styles.gridItem}>
              <GridPoster
                ev={{ ...ev, from: fromOf(ev._id) }}
                saved={saved.has(ev._id)}
                onToggleSave={() => toggleSave(ev._id)}
                onPress={() => router.push(`/event/${ev._id}` as never)}
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: "800", marginBottom: 12 },
  searchWrap: { marginBottom: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  popular: { marginTop: 14, marginBottom: 4 },
  rule: { fontSize: 11, letterSpacing: 0.6, marginBottom: 9 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 16,
    marginBottom: 14,
  },
  count: { fontSize: 16, fontWeight: "800" },
  selectors: { flexDirection: "row", gap: 8 },
  loading: { paddingTop: 50, alignItems: "center" },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 19, fontWeight: "800" },
  emptyBody: { fontSize: 13.5, textAlign: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  gridItem: { width: "48%" },
});
