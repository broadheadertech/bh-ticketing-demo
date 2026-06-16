// CertificateCard.tsx — printable-style Certificate of Completion.
// A keepsake credential surface: ornate double border, big serif-ish name,
// event title, completion date and a mono verification number. Stays on the
// neutral Plaza `t` palette (a credential, not an event-skinned page).
//
// Fed by convex certificates:getPublic (or a row of certificates:getMine that
// you then resolve via getPublic). Money is irrelevant here.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Award, ShieldCheck } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { formatDate } from "../../lib/format";

// Shape of certificates:getPublic.
export type CertificateData = {
  attendeeName: string;
  eventTitle: string;
  completionDate: number;
  certNumber: string;
  issuedAt: number;
};

export function CertificateCard({ cert }: { cert: CertificateData }) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.outer,
        { backgroundColor: t.card, borderColor: t.hard, borderRadius: t.radii.lg },
        t.shadows.card,
      ]}
    >
      {/* inner hairline frame for the "printed" look */}
      <View style={[styles.inner, { borderColor: t.line2, borderRadius: t.radii.md }]}>
        <View style={[styles.seal, { backgroundColor: t.mango, borderColor: t.hard }]}>
          <Award size={26} color={t.hard} />
        </View>

        <Text style={[styles.kicker, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          CERTIFICATE OF COMPLETION
        </Text>

        <Text style={[styles.presented, { color: t.ink3, fontFamily: t.fonts.body }]}>
          This certifies that
        </Text>

        <Text style={[styles.name, { color: t.ink, fontFamily: t.fonts.head }]}>
          {cert.attendeeName}
        </Text>

        <View style={[styles.rule, { backgroundColor: t.line2 }]} />

        <Text style={[styles.presented, { color: t.ink3, fontFamily: t.fonts.body }]}>
          has successfully completed
        </Text>

        <Text style={[styles.event, { color: t.ink, fontFamily: t.fonts.head }]}>
          {cert.eventTitle}
        </Text>

        <Text style={[styles.date, { color: t.ink2, fontFamily: t.fonts.body }]}>
          {formatDate(cert.completionDate)}
        </Text>

        {/* footer: verification number */}
        <View style={[styles.foot, { borderTopColor: t.line }]}>
          <ShieldCheck size={14} color={t.green} />
          <Text style={[styles.certNo, { color: t.ink2, fontFamily: t.fonts.mono }]}>
            {cert.certNumber}
          </Text>
          <Text style={[styles.issued, { color: t.ink3, fontFamily: t.fonts.mono }]}>
            Issued {formatDate(cert.issuedAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 2,
    padding: 8,
  },
  inner: {
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  seal: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  presented: {
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
  name: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: -0.5,
  },
  rule: {
    width: 120,
    height: 2,
    marginTop: 14,
    borderRadius: 2,
  },
  event: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    marginTop: 26,
    paddingTop: 14,
    width: "100%",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  certNo: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  issued: {
    fontSize: 10.5,
  },
});
