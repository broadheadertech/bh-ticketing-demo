// app/checkout/[id].tsx — order review + payment. Ported from CheckoutScreen in
// m-buy.jsx. Promo codes are validated against the real backend
// (api.promoCodes.validatePromoCode). Payment is NEVER done client-side:
//   - If EXPO_PUBLIC_APP_URL is set, POST /api/checkout mints a Stripe Checkout
//     Session URL which we open with WebBrowser.openAuthSessionAsync(url,
//     returnUrl) — control returns via the "phlive" deep-link scheme.
//   - Otherwise we run a DEMO-PAY path (no real charge) for design/dev.
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useAction } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { ChevronLeft, Lock, Sparkles, Mail } from "lucide-react-native";
import { api, type Id } from "../../lib/convex";
import { useTheme } from "../../theme/ThemeProvider";
import { themeForEvent } from "../../theme/events";
import { Poster, Button } from "../../components/ui";
import { money } from "../../lib/format";
import { PayMethod } from "../../components/buy/PayMethod";
import { type Order } from "../../components/buy/order";

// PayMongo redirects here after pay; we also watch this URL to auto-close the
// in-app browser and return to the app. (Doesn't need to render a real page.)
const SUCCESS_URL = "https://tix.ph/m/checkout/success";
const CANCEL_URL = "https://tix.ph/m/checkout/cancel";

const SERVICE_FEE_PCT = 0.06;

type AppliedPromo = { code: string; discountType: string; discountValue: number };

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ id: string; order?: string }>();
  const eventId = params.id as Id<"events">;
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const order: Order | null = useMemo(() => {
    if (!params.order) return null;
    try {
      return JSON.parse(params.order) as Order;
    } catch {
      return null;
    }
  }, [params.order]);

  const event = useQuery(api.events.getPublicEventById, { eventId });
  const ev = themeForEvent(event ?? {});

  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress ?? ""
  );
  const [pay, setPay] = useState<"gcash" | "card" | "maya">("gcash");
  const [busy, setBusy] = useState(false);
  const createCheckout = useAction(api.payments.createCheckout);

  // useQuery must run unconditionally; gate the promo lookup with the "skip"
  // sentinel until the user submits a code.
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const promoResult = useQuery(
    api.promoCodes.validatePromoCode,
    pendingCode ? { eventId, code: pendingCode } : "skip"
  );

  useEffect(() => {
    if (!pendingCode || promoResult === undefined) return;
    setCheckingPromo(false);
    if (promoResult.valid) {
      setApplied({
        code: promoResult.code,
        discountType: promoResult.discountType,
        discountValue: promoResult.discountValue,
      });
    } else {
      setApplied(null);
      Alert.alert("Promo code", promoResult.error ?? "Invalid code");
    }
    setPendingCode(null);
  }, [pendingCode, promoResult]);

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: t.paper }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: t.ink, fontFamily: t.fonts.body }}>
          No order to check out.
        </Text>
        <Button
          label="Go back"
          variant="soft"
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        />
      </View>
    );
  }

  const subtotal = order.subtotal;
  const discount = applied
    ? applied.discountType === "percentage"
      ? Math.round(subtotal * (applied.discountValue / 100))
      : Math.min(subtotal, applied.discountValue)
    : 0;
  const fee = Math.round((subtotal - discount) * SERVICE_FEE_PCT);
  const total = subtotal - discount + fee;

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    setCheckingPromo(true);
    setPendingCode(code);
  };

  const onPay = async () => {
    if (busy) return;
    if (!email.trim()) {
      Alert.alert("Email required", "Where should we send your tickets?");
      return;
    }
    setBusy(true);

    // Only GA tiers carry a tierId the server can re-price + inventory-check.
    const tierSelections = order.lines
      .filter((l) => l.tierId)
      .map((l) => ({ tierId: l.tierId as string, quantity: l.qty }));

    // Live PayMongo checkout for GA orders (GCash / Maya / GrabPay / card).
    if (order.type === "ga" && tierSelections.length > 0) {
      try {
        const result = await createCheckout({
          eventId,
          tierSelections,
          buyerEmail: email.trim(),
          promoCode: applied?.code,
          successUrl: SUCCESS_URL,
          cancelUrl: CANCEL_URL,
        });
        if ("error" in result) {
          setBusy(false);
          Alert.alert("Checkout error", result.error);
          return;
        }
        // Open PayMongo's hosted page; auto-returns when it redirects to SUCCESS_URL.
        const res = await WebBrowser.openAuthSessionAsync(result.url, SUCCESS_URL);
        setBusy(false);
        if (res.type === "success") {
          router.replace({
            pathname: "/checkout/success",
            params: { id: eventId, pending: "1" },
          });
        }
        // "cancel"/"dismiss" -> stay so the buyer can retry.
      } catch (err) {
        setBusy(false);
        Alert.alert(
          "Checkout error",
          err instanceof Error ? err.message : "Could not open payment page",
        );
      }
      return;
    }

    // Reserved-seat orders aren't server-priced yet → demo path (no real charge).
    setTimeout(() => {
      setBusy(false);
      router.replace({
        pathname: "/checkout/success",
        params: { id: eventId, demo: "1" },
      });
    }, 900);
  };

  const eventLoading = event === undefined;

  return (
    <View style={[styles.fill, { backgroundColor: t.paper }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* header */}
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.iconBtn, { borderColor: t.line }]}
          >
            <ChevronLeft size={20} color={t.ink} />
          </Pressable>
          <Text style={[styles.headTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
            Checkout
          </Text>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* event summary */}
        <View style={[styles.summary, { backgroundColor: t.card, borderRadius: t.radii.md }, t.shadows.card]}>
          <View style={styles.poster}>
            <Poster eventTheme={ev} image={event?.artworkUrl} ratio={1 / 1.15} scrim={false} rounded={10} />
          </View>
          <View style={styles.summaryText}>
            {eventLoading ? (
              <Text style={{ color: t.ink3, fontFamily: t.fonts.mono, fontSize: 11 }}>
                LOADING…
              </Text>
            ) : (
              <>
                <Text style={[styles.summaryTitle, { color: t.ink, fontFamily: t.fonts.head }]} numberOfLines={2}>
                  {event?.title}
                </Text>
                <Text style={[styles.summarySub, { color: t.ink3, fontFamily: t.fonts.body }]} numberOfLines={1}>
                  {event?.venueName ?? event?.city ?? "Venue TBA"}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* order lines */}
        <Text style={[styles.secHead, { color: t.ink, fontFamily: t.fonts.head }]}>Your order</Text>
        <View style={{ gap: 10 }}>
          {order.lines.map((l, i) => (
            <View key={i} style={styles.lineRow}>
              <Text style={[styles.lineName, { color: t.ink, fontFamily: t.fonts.body }]}>
                {l.qty}× {l.name}
              </Text>
              <Text style={[styles.lineAmt, { color: t.ink, fontFamily: t.fonts.mono }]}>
                {money(l.price * l.qty)}
              </Text>
            </View>
          ))}
        </View>

        {/* promo */}
        <View style={styles.promoRow}>
          <View style={[styles.search, { backgroundColor: t.paper2, borderColor: t.line, borderRadius: t.radii.md }]}>
            <Sparkles size={16} color={t.ink3} />
            <TextInput
              value={promo}
              onChangeText={(v) => {
                setPromo(v);
                setApplied(null);
              }}
              placeholder="Promo code"
              placeholderTextColor={t.ink3}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, { color: t.ink, fontFamily: t.fonts.body }]}
            />
          </View>
          <Button
            label="Apply"
            variant="ink"
            size="sm"
            loading={checkingPromo}
            onPress={applyPromo}
            style={{ paddingHorizontal: 18 }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: t.line }]} />

        {/* totals */}
        <View style={{ gap: 9 }}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: t.ink3, fontFamily: t.fonts.body }]}>Subtotal</Text>
            <Text style={[styles.totalVal, { color: t.ink, fontFamily: t.fonts.mono }]}>{money(subtotal)}</Text>
          </View>
          {!!applied && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: t.green, fontFamily: t.fonts.body, fontWeight: "700" }]}>
                Discount ({applied.code})
              </Text>
              <Text style={[styles.totalVal, { color: t.green, fontFamily: t.fonts.mono, fontWeight: "700" }]}>
                −{money(discount)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: t.ink3, fontFamily: t.fonts.body }]}>Service fee</Text>
            <Text style={[styles.totalVal, { color: t.ink, fontFamily: t.fonts.mono }]}>{money(fee)}</Text>
          </View>
        </View>

        {/* email */}
        <Text style={[styles.kbd, { color: t.ink3, fontFamily: t.fonts.mono, marginTop: 20, marginBottom: 8 }]}>
          TICKETS SENT TO
        </Text>
        <View style={[styles.search, { backgroundColor: t.paper2, borderColor: t.line, borderRadius: t.radii.md }]}>
          <Mail size={16} color={t.ink3} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.ph"
            placeholderTextColor={t.ink3}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: t.ink, fontFamily: t.fonts.body }]}
          />
        </View>

        {/* payment */}
        <Text style={[styles.kbd, { color: t.ink3, fontFamily: t.fonts.mono, marginTop: 20, marginBottom: 10 }]}>
          PAYMENT METHOD
        </Text>
        <View style={{ gap: 10 }}>
          <PayMethod id="gcash" label="GCash" sub="Pay with your GCash wallet" on={pay === "gcash"} onPress={() => setPay("gcash")} />
          <PayMethod id="card" label="Card" sub="Visa · Mastercard" on={pay === "card"} onPress={() => setPay("card")} />
          <PayMethod id="maya" label="Maya" sub="Pay with Maya wallet" on={pay === "maya"} onPress={() => setPay("maya")} />
        </View>

        <View style={styles.secure}>
          <Lock size={14} color={t.ink3} />
          <Text style={[styles.secureText, { color: t.ink3, fontFamily: t.fonts.body }]}>
            {order.type === "ga"
              ? "Secured by PayMongo. You'll confirm payment (GCash · Maya · card) in a secure window."
              : "Reserved-seat checkout is in demo mode — no real charge yet."}
          </Text>
        </View>
      </ScrollView>

      {/* sticky CTA */}
      <View
        style={[
          styles.cta,
          { backgroundColor: t.card, borderTopColor: t.line, paddingBottom: insets.bottom + 14 },
        ]}
      >
        <Button
          label={busy ? "Processing…" : `Pay ${money(total)}`}
          size="lg"
          block
          loading={busy}
          onPress={onPay}
          left={!busy ? <Lock size={17} strokeWidth={2} color={t.accentInk} /> : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headTitle: { fontSize: 16, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  summary: { flexDirection: "row", gap: 12, padding: 10, marginBottom: 18 },
  poster: { width: 56 },
  summaryText: { flex: 1, justifyContent: "center" },
  summaryTitle: { fontSize: 14.5, fontWeight: "800" },
  summarySub: { fontSize: 12, marginTop: 4 },
  secHead: { fontSize: 17, fontWeight: "800", marginBottom: 10 },
  lineRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  lineName: { flex: 1, fontSize: 14, fontWeight: "700" },
  lineAmt: { fontSize: 13.5, fontWeight: "700" },
  promoRow: { flexDirection: "row", gap: 8, marginTop: 18, alignItems: "center" },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "700", padding: 0 },
  divider: { height: 1, marginVertical: 18 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 13.5 },
  totalVal: { fontSize: 13.5, fontWeight: "700" },
  kbd: { fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  secure: { flexDirection: "row", gap: 8, marginTop: 16, alignItems: "flex-start" },
  secureText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
  cta: { paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1 },
});
