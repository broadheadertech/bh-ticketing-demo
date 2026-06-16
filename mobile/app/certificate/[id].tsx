// app/certificate/[id].tsx — public, printable-style Certificate of Completion.
// [id] is a certificates._id. Pulls certificates:getPublic (a shareable
// credential, no auth required) and renders the CertificateCard. Neutral Plaza
// chrome — a credential is never event-skinned.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Award, Share2 } from "lucide-react-native";
import { api, type Id } from "@/lib/convex";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Placeholder, Screen } from "@/components/ui";
import { CertificateCard, type CertificateData } from "@/components/verticals";

export default function CertificateScreen() {
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const cert = useQuery(api.certificates.getPublic, {
    certificateId: id as Id<"certificates">,
  }) as CertificateData | null | undefined;

  return (
    <Screen>
      <View style={styles.bar}>
        <HeaderBtn onPress={() => router.back()}>
          <ArrowLeft size={20} color={t.ink} />
        </HeaderBtn>
        <Text style={[styles.barTitle, { color: t.ink }]}>Certificate</Text>
        <HeaderBtn onPress={() => {}}>
          <Share2 size={19} color={t.ink} />
        </HeaderBtn>
      </View>

      {cert === undefined ? (
        <View style={{ paddingTop: 12 }}>
          <Placeholder height={460} label="loading certificate" />
        </View>
      ) : cert === null ? (
        <View style={styles.missing}>
          <View style={[styles.missIcon, { backgroundColor: t.paper2, borderColor: t.ink }]}>
            <Award size={28} color={t.ink} />
          </View>
          <Text style={[styles.missTitle, { color: t.ink }]}>
            Certificate not found
          </Text>
          <Text style={[styles.missBody, { color: t.ink3 }]}>
            This certificate may have been revoked or the link is invalid.
          </Text>
          <View style={{ marginTop: 8 }}>
            <Button label="Go back" variant="g" onPress={() => router.back()} />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <CertificateCard cert={cert} />
          <Text style={[styles.note, { color: t.ink3, fontFamily: t.fonts.body }]}>
            Verify this credential with the number above. Screenshot or share to
            show proof of completion.
          </Text>
          <Button
            label="Share certificate"
            variant="ink"
            size="lg"
            block
            left={<Share2 size={18} color={t.paper} />}
            onPress={() => {}}
          />
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
        { backgroundColor: t.paper2, borderColor: t.line, opacity: pressed ? 0.7 : 1 },
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
  body: { paddingTop: 10, gap: 16 },
  note: { fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
  missing: { paddingTop: 64, alignItems: "center", gap: 10, paddingHorizontal: 16 },
  missIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  missTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  missBody: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 280 },
});
