// app/checkout/success.tsx — post-payment confirmation. Reached after Stripe
// Checkout deep-links back (or after the demo-pay path). The webhook on the web
// side is what actually issues the ticket records; this screen just confirms and
// routes the buyer to their wallet. Kept on neutral Plaza `t` (checkout/QR
// surfaces are not event-skinned).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Check, Ticket } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button, Screen } from "../../components/ui";

export default function CheckoutSuccessScreen() {
  const { demo } = useLocalSearchParams<{ id?: string; demo?: string }>();
  const { t } = useTheme();
  const isDemo = demo === "1";

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: t.green }]}>
          <Check size={42} strokeWidth={3} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: t.ink, fontFamily: t.fonts.head }]}>
          You&apos;re in!
        </Text>
        <Text style={[styles.body, { color: t.ink3, fontFamily: t.fonts.body }]}>
          {isDemo
            ? "Demo purchase complete — no real charge was made. Your tickets are in your wallet."
            : "Payment confirmed. Your tickets are being issued and will appear in your wallet shortly."}
        </Text>

        <View style={styles.actions}>
          <Button
            label="View my tickets"
            size="lg"
            block
            left={<Ticket size={18} strokeWidth={2.2} color={t.accentInk} />}
            onPress={() => router.replace("/(tabs)/tickets")}
          />
          <Button
            label="Back to home"
            variant="soft"
            size="lg"
            block
            onPress={() => router.replace("/(tabs)")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 12, marginTop: 2 },
  actions: { width: "100%", gap: 10, marginTop: 28 },
});
