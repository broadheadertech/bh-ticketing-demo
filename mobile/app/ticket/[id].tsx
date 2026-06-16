// app/ticket/[id].tsx — ticket detail keepsake. Pulls the signed-in user's
// tickets (convex tickets:getMyTickets) and finds the one matching the [id] route
// param, then renders the QR keepsake card with the real scannable tk.qrCode.
// The page chrome wears the event's world while mounted (setEventTheme).
import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ArrowLeft, CheckCircle, Share2, Wallet } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useOfflineTickets } from "@/lib/offline";
import { themeForEvent } from "@/theme/events";
import { Button, Placeholder, Screen } from "@/components/ui";
import { TicketQRCard } from "@/components/wallet";

export default function TicketDetailScreen() {
  const { t, setEventTheme } = useTheme();
  const { id, justBought } = useLocalSearchParams<{
    id: string;
    justBought?: string;
  }>();
  const { isSignedIn, isLoaded } = useAuth();

  // Live-or-cache so the QR keepsake renders offline at the gate. The QR value
  // (tk.qrCode) is a pre-signed string, so the cached ticket scans fully offline.
  const { tickets, loading } = useOfflineTickets();

  const tk = useMemo(
    () => tickets?.find((x) => x._id === id),
    [tickets, id],
  );

  // Wear the event's world while the keepsake is open; clear on unmount.
  useEffect(() => {
    if (!tk) return;
    setEventTheme(
      themeForEvent({ theme: tk.eventTheme, eventType: tk.eventType ?? undefined }),
    );
    return () => setEventTheme(null);
  }, [tk, setEventTheme]);

  return (
    <Screen>
      {/* header */}
      <View style={styles.bar}>
        <HeaderBtn onPress={() => router.back()}>
          <ArrowLeft size={20} color={t.ink} />
        </HeaderBtn>
        <Text style={[styles.barTitle, { color: t.ink }]}>Your ticket</Text>
        <HeaderBtn onPress={() => {}}>
          <Share2 size={19} color={t.ink} />
        </HeaderBtn>
      </View>

      {!isLoaded || (isSignedIn && loading) ? (
        <View style={{ paddingTop: 12 }}>
          <Placeholder height={420} label="loading ticket" />
        </View>
      ) : !tk ? (
        <View style={styles.missing}>
          <Text style={[styles.missingTitle, { color: t.ink }]}>
            Ticket not found
          </Text>
          <Text style={[styles.missingBody, { color: t.ink3 }]}>
            This ticket isn't in your wallet. It may belong to another account.
          </Text>
          <View style={{ marginTop: 8 }}>
            <Button label="Back to tickets" variant="g" onPress={() => router.back()} />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          {justBought === "1" && (
            <View
              style={[
                styles.bought,
                { backgroundColor: t.card, borderColor: t.green },
              ]}
            >
              <View style={[styles.boughtIcon, { backgroundColor: t.green }]}>
                <CheckCircle size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.boughtTitle, { color: t.ink }]}>You're in!</Text>
                <Text style={[styles.boughtBody, { color: t.ink3 }]}>
                  Tickets sent to your email & saved here.
                </Text>
              </View>
            </View>
          )}

          <TicketQRCard tk={tk} />

          <Text style={[styles.note, { color: t.ink3 }]}>
            Keep this screen ready at the gate — staff scan the QR to admit you.
          </Text>

          <View style={styles.actions}>
            <Button
              label="Add to Apple Wallet"
              variant="ink"
              size="lg"
              block
              left={<Wallet size={18} color={t.paper} />}
              onPress={() => {}}
            />
            <Button
              label="Transfer ticket"
              variant="g"
              block
              left={<Share2 size={18} color={t.ink} />}
              onPress={() => {}}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

function HeaderBtn({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          backgroundColor: t.paper2,
          borderColor: t.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 6,
  },
  barTitle: { fontSize: 15, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingTop: 6, gap: 16 },
  bought: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  boughtIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  boughtTitle: { fontSize: 13.5, fontWeight: "800" },
  boughtBody: { fontSize: 11.5, marginTop: 1 },
  note: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: "center",
    marginTop: -2,
  },
  actions: { gap: 10 },
  missing: { paddingTop: 64, alignItems: "center", gap: 8, paddingHorizontal: 16 },
  missingTitle: { fontSize: 20, fontWeight: "800" },
  missingBody: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 280 },
});
