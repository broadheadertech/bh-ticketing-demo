// app/(tabs)/index.tsx — Home / discover feed. Ported from m-home.jsx <HomeScreen />.
//
// Sections: header + faux search → category chips → "This week" featured
// carousel → "Near you" mini-poster rail → "This weekend" event-row list →
// "Trending" artist chips → "Top organizers" rows. Driven by the public Convex
// queries events.listPublicEvents + ticketTiers.getPriceRangeByEventIds.
import { useRouter, type Href } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, MapPin, LocateFixed } from "lucide-react-native";
import { useDeviceCity } from "@/lib/location";
import { useQuery } from "convex/react";
import { Chip, Screen, SectionHead } from "@/components/ui";
import { api, type Id } from "@/lib/convex";
import { useTheme } from "@/theme/ThemeProvider";
import {
  ArtistChip,
  EmptyFeed,
  EventRow,
  FeaturedPoster,
  FEATURED_WIDTH_RATIO,
  FeedSkeleton,
  HomeHeader,
  MiniPoster,
  OrganizerRow,
  SearchBar,
  type PublicEvent,
} from "@/components/home";

// Filter chips map labels to the event `eventType` they match ("all" = no filter).
const CATEGORIES: { label: string; type: string | null }[] = [
  { label: "All", type: null },
  { label: "Concerts", type: "concert" },
  { label: "Races", type: "racing" },
  { label: "Seminars", type: "seminar" },
  { label: "Classes", type: "class" },
  { label: "Other", type: "other" },
];

export default function HomeScreen() {
  const { t } = useTheme();
  const router = useRouter();
  const screenW = useScreenWidth();
  const featuredW = Math.round(screenW * FEATURED_WIDTH_RATIO);

  const [cat, setCat] = useState<string>("All");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [city, setCity] = useState<string | null>(null); // null = all cities
  const [cityOpen, setCityOpen] = useState(false);
  const { detect, status: locStatus } = useDeviceCity();

  const events = useQuery(api.events.listPublicEvents) as PublicEvent[] | undefined;

  // Distinct cities present in the live events (real data — drives the picker).
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const e of events ?? []) {
      const c = cityOf(e);
      if (c) set.add(c);
    }
    return [...set].sort();
  }, [events]);

  const eventIds = useMemo(
    () => (events ? events.map((e) => e._id as string) : []),
    [events],
  );
  const prices = useQuery(
    api.ticketTiers.getPriceRangeByEventIds,
    events ? { eventIds } : "skip",
  );

  const filtered = useMemo(() => {
    if (!events) return [];
    const sel = CATEGORIES.find((c) => c.label === cat)?.type ?? null;
    let list = sel ? events.filter((e) => e.eventType === sel) : events;
    if (city) list = list.filter((e) => cityOf(e) === city);
    return list;
  }, [events, cat, city]);

  // Derive the rails from the (filtered) list, mirroring m-home.jsx slicing.
  const featured = filtered.slice(0, 4);
  const near = filtered.slice(2, 8);
  const weekend = filtered.slice(0, 4);

  // Trending "worlds" + organizer groupings derived from the full event list
  // (real data; no fabricated names). One entry per event type that has events.
  const groups = useMemo(() => groupByType(events ?? []), [events]);

  const goEvent = (id: Id<"events">) =>
    router.push(`/event/${id}` as Href);
  const goBrowse = () => router.push("/browse");

  const useMyLocation = async () => {
    const detected = await detect();
    if (!detected) {
      Alert.alert("Location", "Couldn't detect your location. Pick a city below instead.");
      return;
    }
    const match = cities.find((c) => c.toLowerCase() === detected.toLowerCase());
    if (match) {
      setCity(match);
    } else {
      Alert.alert("Near you", `No events around ${detected} yet — showing all cities.`);
      setCity(null);
    }
    setCityOpen(false);
  };

  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const loading = events === undefined;
  const empty = !loading && events.length === 0;

  return (
    <Screen pad={false}>
      <View style={{ paddingHorizontal: t.pad }}>
        <HomeHeader
          city={city ?? "All cities"}
          onPressCity={() => setCityOpen(true)}
          onPressBell={() => router.push("/profile")}
        />
        <View style={{ marginTop: 12 }}>
          <SearchBar onPress={goBrowse} />
        </View>
      </View>

      {/* category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipRow, { paddingHorizontal: t.pad }]}
        style={{ marginTop: 14 }}
      >
        {CATEGORIES.map((c) => (
          <Chip key={c.label} label={c.label} on={c.label === cat} onPress={() => setCat(c.label)} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ paddingHorizontal: t.pad }}>
          <FeedSkeleton featuredWidth={featuredW} />
        </View>
      ) : empty ? (
        <View style={{ paddingHorizontal: t.pad }}>
          <EmptyFeed />
        </View>
      ) : (
        <>
          {/* This week — featured carousel */}
          {featured.length > 0 ? (
            <View style={styles.section}>
              <View style={{ paddingHorizontal: t.pad }}>
                <SectionHead title="This week" index={`${pad2(featured.length)} live`} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={featuredW + 13}
                decelerationRate="fast"
                contentContainerStyle={[styles.rail, { paddingHorizontal: t.pad }]}
              >
                {featured.map((ev) => (
                  <FeaturedPoster
                    key={ev._id}
                    ev={ev}
                    prices={prices}
                    width={featuredW}
                    onPress={() => goEvent(ev._id)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Near you — mini posters */}
          {near.length > 0 ? (
            <View style={styles.section}>
              <View style={{ paddingHorizontal: t.pad }}>
                <SectionHead title="Near you" linkLabel="See all ›" onPressLink={goBrowse} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.rail, { paddingHorizontal: t.pad }]}
              >
                {near.map((ev) => (
                  <MiniPoster
                    key={ev._id}
                    ev={ev}
                    prices={prices}
                    onPress={() => goEvent(ev._id)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* This weekend — list rows */}
          {weekend.length > 0 ? (
            <View style={[styles.section, { paddingHorizontal: t.pad }]}>
              <SectionHead title="This weekend" index="SAT–SUN" />
              <View style={styles.rows}>
                {weekend.map((ev) => (
                  <EventRow
                    key={ev._id}
                    ev={ev}
                    saved={saved.has(ev._id)}
                    onPress={() => goEvent(ev._id)}
                    onToggleSave={() => toggleSave(ev._id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Trending worlds */}
          {groups.length > 0 ? (
            <View style={styles.section}>
              <View style={{ paddingHorizontal: t.pad }}>
                <SectionHead title="Trending" index={`${groups.length} worlds`} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.railWide, { paddingHorizontal: t.pad }]}
              >
                {groups.map((g, i) => (
                  <ArtistChip
                    key={g.type}
                    label={g.label}
                    caption={`${g.count} live`}
                    hue={(i * 67) % 360}
                    onPress={goBrowse}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Top organizers (event-type groupings) */}
          {groups.length > 0 ? (
            <View style={[styles.section, { paddingHorizontal: t.pad }]}>
              <SectionHead title="Top organizers" index="VERIFIED" />
              <View style={styles.rows}>
                {groups.slice(0, 3).map((g) => (
                  <OrganizerRow
                    key={g.type}
                    name={g.label}
                    eventType={g.type}
                    meta={`${g.count} upcoming event${g.count > 1 ? "s" : ""}`}
                    onPress={goBrowse}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      {/* City picker — driven by the cities present in live events */}
      <Modal
        visible={cityOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCityOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCityOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: t.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
              Choose city
            </Text>
            <Pressable
              style={styles.cityRow}
              onPress={useMyLocation}
              disabled={locStatus === "loading"}
            >
              <LocateFixed color={t.accent} size={16} />
              <Text style={[styles.cityLabel, { color: t.accent, fontFamily: t.fonts.body }]}>
                {locStatus === "loading" ? "Detecting…" : "Use my location"}
              </Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 340 }}>
              {[null, ...cities].map((c) => {
                const label = c ?? "All cities";
                const on = city === c;
                return (
                  <Pressable
                    key={label}
                    style={styles.cityRow}
                    onPress={() => {
                      setCity(c);
                      setCityOpen(false);
                    }}
                  >
                    <MapPin color={on ? t.accent : t.ink3} size={16} />
                    <Text
                      style={[
                        styles.cityLabel,
                        { color: on ? t.accent : t.ink, fontFamily: t.fonts.body },
                      ]}
                    >
                      {label}
                    </Text>
                    {on ? <Check color={t.accent} size={16} /> : null}
                  </Pressable>
                );
              })}
              {cities.length === 0 ? (
                <Text style={[styles.cityEmpty, { color: t.ink3, fontFamily: t.fonts.body }]}>
                  No cities in the current events yet.
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// City label for an event: explicit `city`, else the part after the last comma
// of the venue name ("12 Monkeys Music Hall, Mandaluyong" -> "Mandaluyong").
function cityOf(ev: PublicEvent): string | null {
  if (ev.city) return ev.city;
  if (ev.venueName && ev.venueName.includes(",")) {
    return ev.venueName.split(",").pop()!.trim() || null;
  }
  return null;
}

// ----- helpers -----

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const TYPE_LABELS: Record<string, string> = {
  concert: "Concerts",
  racing: "Races",
  seminar: "Seminars",
  class: "Classes",
  other: "Other",
};

function groupByType(events: PublicEvent[]) {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count, label: TYPE_LABELS[type] ?? cap(type) }))
    .sort((a, b) => b.count - a.count);
}

function cap(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// Width hook kept local to avoid a new dependency; uses RN Dimensions.
function useScreenWidth() {
  const [w, setW] = useState(() => Dimensions.get("window").width);
  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setW(window.width));
    return () => sub.remove();
  }, []);
  return w;
}

const styles = StyleSheet.create({
  chipRow: { gap: 8 },
  section: { marginTop: 24 },
  rail: { gap: 13 },
  railWide: { gap: 14 },
  rows: { gap: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", marginBottom: 10 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  cityLabel: { flex: 1, fontSize: 15, fontWeight: "700" },
  cityEmpty: { fontSize: 13, paddingVertical: 16, textAlign: "center" },
});
