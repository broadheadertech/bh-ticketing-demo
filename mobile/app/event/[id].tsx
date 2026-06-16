// app/event/[id].tsx — Event detail. The hero ADOPTS the event's native world
// (gallery wall) by calling setEventTheme on focus and clearing it on blur, so
// the page chrome wears the event's gradient/accent. Per-event theming is gated
// by a user setting read from ThemeProvider (defaults on). Match the visual
// language of C:/tmp/tixmobile/event-ticketing-flow/project/mobile/m-event.jsx.
//
// Data:
//   events.getPublicEventDetailPage  -> event doc + artworkUrl + lineup[] + creatorProfile
//   ticketTiers.getPublicTiersByEventId -> [{ name, price (centavos), quantity, soldCount, description, ... }]
//   addOns.getPublicAddOnsByEventId  -> [{ name, price (centavos), description, available }]
import React, { useCallback, useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQuery } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Heart,
  MapPin,
  Navigation,
  ShieldCheck,
  Ticket,
} from "lucide-react-native";
import { api, type Id } from "@/lib/convex";
import { useTheme } from "@/theme/ThemeProvider";
import { themeForEvent } from "@/theme/events";
import {
  Button,
  Card,
  Money,
  Placeholder,
  Poster,
  SectionHead,
  Tag,
} from "@/components/ui";
import {
  AddOnRow,
  FactCard,
  LineupChip,
  ScheduleRow,
  TierRow,
} from "@/components/event";
import { formatDate } from "@/lib/format";

// "HH:mm" (24h) -> "7:00 PM"
function pretty12h(hhmm?: string | null): string | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return hhmm ?? null;
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// City label: explicit `city`, else the part after the last comma of the venue
// name ("12 Monkeys Music Hall, Mandaluyong" -> "Mandaluyong").
function cityLabel(event: { city?: string; venueName?: string }): string {
  if (event.city) return event.city;
  if (event.venueName?.includes(",")) {
    return event.venueName.split(",").pop()!.trim() || event.venueName;
  }
  return event.venueName ?? "TBA";
}

// Rotate a small palette for tier/lineup dots when no per-tier color exists.
const DOT_PALETTE = ["#0E8A6E", "#FFC53D", "#9D4EDD", "#118AB2", "#EA5A3D"];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, setEventTheme } = useTheme();

  // Per-event theming is a user setting; the foundation ThemeProvider may expose
  // `themedEvents`. Read it defensively (default ON) so this wires up cleanly.
  const themed =
    (useTheme() as unknown as { themedEvents?: boolean }).themedEvents ?? true;

  const eventId = id as Id<"events"> | undefined;

  const event = useQuery(
    api.events.getPublicEventDetailPage,
    eventId ? { eventId } : "skip",
  );
  const tiers = useQuery(
    api.ticketTiers.getPublicTiersByEventId,
    eventId ? { eventId } : "skip",
  );
  const addOns = useQuery(
    api.addOns.getPublicAddOnsByEventId,
    eventId ? { eventId } : "skip",
  );

  const ev = useMemo(
    () => (event ? themeForEvent(event) : null),
    [event],
  );

  // Wear the event's world while this screen is focused; restore neutral on blur.
  useFocusEffect(
    useCallback(() => {
      if (themed && ev) setEventTheme(ev);
      return () => setEventTheme(null);
    }, [themed, ev, setEventTheme]),
  );
  // Also clear on unmount as a safety net.
  useEffect(() => () => setEventTheme(null), [setEventTheme]);

  // ---- Loading ----
  if (event === undefined) {
    return <EventSkeleton onBack={() => router.back()} />;
  }

  // ---- Not found / not public ----
  if (event === null) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper, paddingTop: insets.top + 40 }]}>
        <Text style={[styles.notFoundTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
          Event not found
        </Text>
        <Text style={[styles.notFoundBody, { color: t.ink2, fontFamily: t.fonts.body }]}>
          This event may have been unpublished or removed.
        </Text>
        <Button label="Go back" variant="g" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const heroTheme = ev!;
  const lineup = event.lineup ?? [];
  const days = event.days ?? [];
  const onSaleTiers = (tiers ?? []).filter((x) => x.quantity - x.soldCount > 0);
  const minPrice =
    tiers && tiers.length > 0 ? Math.min(...tiers.map((x) => x.price)) : null;
  const orgName =
    event.creatorProfile?.displayName ?? "Organizer";
  const doors = pretty12h(event.doorsTime) ?? pretty12h(event.time) ?? "—";

  return (
    <View style={[styles.flex, { backgroundColor: t.paper }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      >
        {/* ---- Themed hero ---- */}
        <View>
          <Poster eventTheme={heroTheme} image={event.artworkUrl} ratio={undefined} style={[styles.hero, { height: 360 }]}>
            {/* top bar: back + actions */}
            <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
              <RoundBtn onPress={() => router.back()}>
                <ChevronLeft color="#fff" size={22} />
              </RoundBtn>
              <View style={styles.heroActions}>
                <RoundBtn onPress={() => {}}>
                  <Heart color="#fff" size={18} />
                </RoundBtn>
              </View>
            </View>

            {/* bottom: tags + title + tagline */}
            <View style={styles.heroBottom}>
              <View style={styles.heroTagRow}>
                <Tag
                  label={event.eventType}
                  bg={heroTheme.accent}
                  fg="#1a1207"
                />
                <Tag
                  label={`${heroTheme.name} theme`}
                  bg="rgba(0,0,0,0.4)"
                  fg="#fff"
                />
              </View>
              <Text style={[styles.heroTitle, { fontFamily: t.fonts.head }]}>
                {event.title}
              </Text>
              {event.tagline ? (
                <Text style={[styles.heroTagline, { fontFamily: t.fonts.body }]}>
                  {event.tagline}
                </Text>
              ) : null}
            </View>
          </Poster>
        </View>

        <View style={{ padding: t.pad, paddingTop: 16 }}>
          {/* organizer */}
          <Card padded style={styles.orgRow}>
            <View style={styles.orgLeft}>
              <View style={[styles.orgLogo, { borderColor: t.ink, backgroundColor: t.paper2 }]}>
                <Text style={[styles.orgLogoCap, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                  {orgName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.kbd, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                  PRESENTED BY
                </Text>
                <View style={styles.orgNameRow}>
                  <Text style={[styles.orgName, { color: t.ink, fontFamily: t.fonts.body }]}>
                    {orgName}
                  </Text>
                  <ShieldCheck color={t.blue} size={13} />
                </View>
              </View>
            </View>
          </Card>

          {/* facts */}
          <View style={styles.factsRow}>
            <FactCard
              icon={<Calendar color={t.accent} size={18} />}
              label="Date"
              value={formatDate(event.date)}
            />
            <FactCard
              icon={<Clock color={t.accent} size={18} />}
              label="Doors"
              value={doors}
            />
            <FactCard
              icon={<MapPin color={t.accent} size={18} />}
              label="City"
              value={cityLabel(event)}
            />
          </View>

          {/* about */}
          <View style={styles.section}>
            <SectionHead title="About" />
            <Text style={[styles.body, { color: t.ink2, fontFamily: t.fonts.body }]}>
              {event.description}
            </Text>
          </View>

          {/* lineup / participants */}
          {lineup.length > 0 ? (
            <View style={styles.section}>
              <SectionHead title="Line-up" index={`${lineup.length} ACTS`} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.lineupRow}
              >
                {lineup.map((name, i) => (
                  <LineupChip key={`${name}-${i}`} name={name} index={i} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* multi-day schedule */}
          {days.length > 1 ? (
            <View style={styles.section}>
              <SectionHead title="Schedule" index={`${days.length} DAYS`} />
              <View style={styles.stack}>
                {days.map((d, i) => (
                  <ScheduleRow
                    key={d.id}
                    label={d.label}
                    date={d.date}
                    startTime={d.startTime}
                    endTime={d.endTime}
                    index={i}
                    accent={heroTheme.accent}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* venue */}
          {event.venueName ? (
            <View style={styles.section}>
              <SectionHead
                title="Venue"
                linkLabel="Directions ›"
                onPressLink={() => {}}
              />
              <Card padded={false} style={styles.venueCard}>
                <Placeholder height={130} label="venue map" rounded={0} />
                <View style={styles.venueMeta}>
                  <View style={styles.flex}>
                    <Text style={[styles.venueName, { color: t.ink, fontFamily: t.fonts.body }]}>
                      {event.venueName}
                    </Text>
                    <Text style={[styles.venueCity, { color: t.ink3, fontFamily: t.fonts.body }]}>
                      {event.city ? `${event.city}, ` : ""}Philippines
                    </Text>
                  </View>
                  <View style={[styles.venueIcon, { backgroundColor: t.paper2 }]}>
                    <Navigation color={t.ink} size={18} />
                  </View>
                </View>
              </Card>
            </View>
          ) : null}

          {/* tickets */}
          <View style={styles.section}>
            <SectionHead
              title="Tickets"
              index={
                tiers === undefined
                  ? undefined
                  : `${onSaleTiers.length} ON SALE`
              }
            />
            {tiers === undefined ? (
              <View style={styles.stack}>
                <Placeholder height={64} label="" />
                <Placeholder height={64} label="" />
              </View>
            ) : tiers.length === 0 ? (
              <Card padded>
                <Text style={[styles.empty, { color: t.ink3, fontFamily: t.fonts.body }]}>
                  No ticket tiers available yet.
                </Text>
              </Card>
            ) : (
              <View style={styles.stack}>
                {tiers.map((tier, i) => (
                  <TierRow
                    key={tier._id}
                    name={tier.name}
                    description={tier.description}
                    price={tier.price}
                    available={tier.quantity - tier.soldCount}
                    dotColor={DOT_PALETTE[i % DOT_PALETTE.length]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* add-ons */}
          {addOns && addOns.length > 0 ? (
            <View style={styles.section}>
              <SectionHead title="Add-ons" index={`${addOns.length}`} />
              <View style={styles.stack}>
                {addOns.map((a) => (
                  <AddOnRow
                    key={a._id}
                    name={a.name}
                    description={a.description}
                    price={a.price}
                    available={a.available}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ---- Sticky CTA ---- */}
      <View
        style={[
          styles.cta,
          {
            backgroundColor: t.card,
            borderTopColor: t.ink,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View>
          <Text style={[styles.kbd, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            FROM
          </Text>
          {minPrice == null ? (
            <Text style={[styles.ctaPrice, { color: t.ink3, fontFamily: t.fonts.head }]}>
              —
            </Text>
          ) : (
            <Money
              centavos={minPrice}
              whole
              style={[styles.ctaPrice, { color: t.accent, fontFamily: t.fonts.head }]}
            />
          )}
        </View>
        <Button
          label="Get tickets"
          variant="p"
          size="lg"
          left={<Ticket color={t.accentInk} size={19} />}
          disabled={!onSaleTiers.length}
          onPress={() =>
            eventId ? router.push(`/event/${eventId}/buy` as Href) : undefined
          }
        />
      </View>
    </View>
  );
}

// ---- small helpers ----

function RoundBtn({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundBtn,
        { transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}

function EventSkeleton({ onBack }: { onBack: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: t.paper }]}>
      <View style={{ height: 360 }}>
        <Placeholder height={360} label="loading event" rounded={0} />
        <View style={[styles.heroTop, { paddingTop: insets.top + 8, position: "absolute", left: 0, right: 0 }]}>
          <RoundBtn onPress={onBack}>
            <ChevronLeft color={t.ink} size={22} />
          </RoundBtn>
        </View>
      </View>
      <View style={{ padding: t.pad, gap: 12 }}>
        <Placeholder height={56} label="" />
        <View style={styles.factsRow}>
          <Placeholder height={72} label="" />
          <Placeholder height={72} label="" />
          <Placeholder height={72} label="" />
        </View>
        <Placeholder height={120} label="" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", paddingHorizontal: 32 },
  notFoundTitle: { fontSize: 22, fontWeight: "800" },
  notFoundBody: { fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },

  hero: { borderRadius: 0, borderWidth: 0 },
  heroTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  heroActions: { flexDirection: "row", gap: 8 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: { position: "absolute", left: 16, right: 16, bottom: 16 },
  heroTagRow: { flexDirection: "row", gap: 7 },
  heroTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 11,
    lineHeight: 33,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 2 },
  },
  heroTagline: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 14.5,
    marginTop: 7,
    fontWeight: "600",
  },

  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  orgLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  orgLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  orgLogoCap: { fontSize: 16, fontWeight: "800" },
  orgNameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  orgName: { fontSize: 14, fontWeight: "800" },

  kbd: { fontSize: 9.5, letterSpacing: 0.5 },

  factsRow: { flexDirection: "row", gap: 10, marginTop: 16 },

  section: { marginTop: 24 },
  body: { fontSize: 14.5, lineHeight: 23 },

  lineupRow: { gap: 14, paddingRight: 4 },

  stack: { gap: 9 },

  venueCard: { overflow: "hidden" },
  venueMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    gap: 10,
  },
  venueName: { fontSize: 14.5, fontWeight: "800" },
  venueCity: { fontSize: 12.5, marginTop: 3 },
  venueIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { fontSize: 13.5, textAlign: "center", paddingVertical: 8 },

  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaPrice: { fontSize: 22, fontWeight: "800", marginTop: 1 },
});
