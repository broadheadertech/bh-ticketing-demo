// WaiverSheet.tsx — race liability waiver: read the text, type your full name
// as a signature, accept. Fed by a row of races:getMyWaivers; submits via
// races:signWaiver (the parent screen owns the mutation). Once signed it
// renders a read-only "signed" confirmation instead of the form.
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { CheckCircle2, FileText } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui";

// One element of races:getMyWaivers.
export type WaiverData = {
  ticketId: string;
  eventTitle: string;
  waiverText: string;
  signed: boolean;
  signerName: string | null;
};

export function WaiverSheet({
  waiver,
  onSign,
  submitting,
}: {
  waiver: WaiverData;
  /** called with the typed signature; parent runs races:signWaiver. */
  onSign: (signerName: string) => void;
  submitting?: boolean;
}) {
  const { t } = useTheme();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);

  const canSign = name.trim().length >= 2 && accepted && !submitting;

  if (waiver.signed) {
    return (
      <View
        style={[
          styles.signed,
          { backgroundColor: t.card, borderColor: t.green, borderRadius: t.radii.md },
          t.shadows.card,
        ]}
      >
        <View style={[styles.signedIcon, { backgroundColor: t.green }]}>
          <CheckCircle2 size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.signedTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
            Waiver signed
          </Text>
          <Text style={[styles.signedBody, { color: t.ink3, fontFamily: t.fonts.body }]}>
            Signed as {waiver.signerName ?? "—"} for {waiver.eventTitle}.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.line, borderRadius: t.radii.md },
        t.shadows.card,
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.headIcon, { backgroundColor: t.paper2, borderColor: t.line }]}>
          <FileText size={18} color={t.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.ink, fontFamily: t.fonts.head }]}>
            Liability waiver
          </Text>
          <Text style={[styles.sub, { color: t.ink3, fontFamily: t.fonts.body }]}>
            {waiver.eventTitle}
          </Text>
        </View>
      </View>

      {/* waiver body */}
      <View
        style={[
          styles.textBox,
          { backgroundColor: t.paper2, borderColor: t.line, borderRadius: t.radii.sm },
        ]}
      >
        <Text style={[styles.waiverText, { color: t.ink2, fontFamily: t.fonts.body }]}>
          {waiver.waiverText}
        </Text>
      </View>

      {/* accept toggle */}
      <Button
        label={accepted ? "I have read & accept the waiver" : "Tap to accept the waiver"}
        variant={accepted ? "ink" : "soft"}
        size="md"
        block
        left={
          <CheckCircle2
            size={18}
            color={accepted ? t.paper : t.ink3}
          />
        }
        onPress={() => setAccepted((v) => !v)}
      />

      {/* signature */}
      <View style={{ gap: 6, marginTop: 4 }}>
        <Text style={[styles.label, { color: t.ink2, fontFamily: t.fonts.mono }]}>
          TYPE YOUR FULL NAME (SIGNATURE)
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Juan Dela Cruz"
          placeholderTextColor={t.ink3}
          autoCapitalize="words"
          style={[
            styles.input,
            {
              color: t.ink,
              backgroundColor: t.paper,
              borderColor: t.line2,
              borderRadius: t.radii.sm,
              fontFamily: t.fonts.body,
            },
          ]}
        />
      </View>

      <Button
        label="Sign waiver"
        variant="p"
        size="lg"
        block
        loading={submitting}
        disabled={!canSign}
        onPress={() => onSign(name.trim())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 13, marginTop: 1 },
  textBox: {
    borderWidth: 1,
    padding: 14,
    maxHeight: 280,
  },
  waiverText: { fontSize: 13.5, lineHeight: 21 },
  label: { fontSize: 10.5, letterSpacing: 1, fontWeight: "700" },
  input: {
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
  },
  signed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    padding: 16,
  },
  signedIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  signedTitle: { fontSize: 16, fontWeight: "800" },
  signedBody: { fontSize: 13, lineHeight: 19, marginTop: 1 },
});
