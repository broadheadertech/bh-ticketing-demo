// app/(tabs)/tickets.tsx — My Tickets wallet. Lists the signed-in user's tickets
// (convex tickets:getMyTickets, Clerk-authed) split into Upcoming / Past, each as
// a themed ticket stub. Tapping a stub opens the keepsake QR at /ticket/[id].
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ticket, Wallet, WifiOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useOfflineTickets } from "@/lib/offline";
import { Button, Placeholder, Screen } from "@/components/ui";
import { Segmented, TicketStub, isPastTicket } from "@/components/wallet";

type TabKey = "upcoming" | "past";

export default function TicketsScreen() {
  const { t } = useTheme();
  const { isSignedIn, isLoaded } = useAuth();
  const [tab, setTab] = useState<TabKey>("upcoming");

  // Live-or-cache: persists to disk on success and serves the cache offline so
  // the wallet keeps working at the gate with no signal.
  const { tickets, loading, fromCache } = useOfflineTickets();

  const list = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((tk) =>
      tab === "upcoming" ? !isPastTicket(tk) : isPastTicket(tk),
    );
  }, [tickets, tab]);

  return (
    <Screen>
      {/* header */}
      <View style={styles.bar}>
        <Text style={[styles.h1, { color: t.ink }]}>Tickets</Text>
        <View style={[styles.iconBtn, { backgroundColor: t.paper2, borderColor: t.line }]}>
          <Wallet size={20} color={t.ink} />
        </View>
      </View>

      {isSignedIn && fromCache && (
        <View style={[styles.offline, { backgroundColor: t.paper2, borderColor: t.line }]}>
          <WifiOff size={14} color={t.ink3} />
          <Text style={[styles.offlineTxt, { color: t.ink3 }]}>
            Offline — showing saved tickets
          </Text>
        </View>
      )}

      <View style={styles.segWrap}>
        <Segmented<TabKey>
          value={tab}
          onChange={setTab}
          options={[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
          ]}
        />
      </View>

      {/* body */}
      {!isLoaded ? (
        <SkeletonList />
      ) : !isSignedIn ? (
        <Empty
          title="Sign in to see your tickets"
          body="Your purchased tickets are tied to your account — sign in to access them here."
        />
      ) : loading ? (
        <SkeletonList />
      ) : list.length === 0 ? (
        <Empty
          title={tab === "upcoming" ? "No upcoming tickets" : "No past events"}
          body={
            tab === "upcoming"
              ? "When you buy tickets they show up here — ready to scan at the gate."
              : "Events you've attended will appear here."
          }
          cta={tab === "upcoming" ? "Find an event" : undefined}
          onCta={() => router.push("/browse")}
        />
      ) : (
        <View style={styles.colList}>
          {list.map((tk) => (
            <TicketStub
              key={tk._id}
              tk={tk}
              onPress={() => router.push(`/ticket/${tk._id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function SkeletonList() {
  return (
    <View style={styles.colList}>
      {[0, 1, 2].map((i) => (
        <Placeholder key={i} height={150} label="loading ticket" />
      ))}
    </View>
  );
}

function Empty({
  title,
  body,
  cta,
  onCta,
}: {
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: t.paper2, borderColor: t.ink }]}>
        <Ticket size={28} color={t.ink} />
      </View>
      <Text style={[styles.emptyTitle, { color: t.ink }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: t.ink3 }]}>{body}</Text>
      {cta && (
        <View style={{ marginTop: 4 }}>
          <Button label={cta} variant="p" onPress={onCta} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 4,
  },
  h1: { fontSize: 26, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 10,
  },
  offlineTxt: { fontSize: 12, fontWeight: "600" },
  segWrap: { paddingBottom: 12, paddingTop: 8 },
  colList: { gap: 16, paddingTop: 8 },
  empty: {
    alignItems: "center",
    gap: 12,
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 21, fontWeight: "800", textAlign: "center" },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 260,
  },
});
