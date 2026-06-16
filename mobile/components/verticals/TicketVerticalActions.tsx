// TicketVerticalActions.tsx — drop-in vertical-feature block for a ticket in the
// wallet / ticket-detail screen. Given a ticketId it self-resolves the signed-in
// user's certificates (certificates:getMine) and race waivers
// (races:getMyWaivers), then surfaces the relevant per-ticket actions:
//   - "Sign waiver"  -> expands an inline WaiverSheet (read + accept + type name)
//                       and submits via races:signWaiver. Once signed it shows the
//                       signed-confirmation state.
//   - "View certificate" -> navigates to /certificate/[id] (printable view).
// Renders nothing if the ticket has neither a waiver nor a certificate, so it is
// safe to mount on every ticket. Usage in the ticket-detail screen:
//   import { TicketVerticalActions } from "@/components/verticals";
//   <TicketVerticalActions ticketId={tk._id} />
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { Award, FileSignature } from "lucide-react-native";
import { api, type Id } from "../../lib/convex";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../ui";
import { WaiverSheet, type WaiverData } from "./WaiverSheet";

type CertMine = {
  _id: Id<"certificates">;
  ticketId: Id<"tickets">;
  certNumber: string;
  eventTitle: string;
  completionDate: number;
};

export function TicketVerticalActions({ ticketId }: { ticketId: string }) {
  const { t } = useTheme();
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const certs = useQuery(
    api.certificates.getMine,
    isSignedIn ? {} : "skip",
  ) as CertMine[] | undefined;
  const waivers = useQuery(
    api.races.getMyWaivers,
    isSignedIn ? {} : "skip",
  ) as WaiverData[] | undefined;

  const signWaiver = useMutation(api.races.signWaiver);

  const cert = certs?.find((c) => String(c.ticketId) === String(ticketId));
  const waiver = waivers?.find((w) => String(w.ticketId) === String(ticketId));

  if (!cert && !waiver) return null;

  const handleSign = async (signerName: string) => {
    if (!waiver) return;
    try {
      setSubmitting(true);
      await signWaiver({
        ticketId: waiver.ticketId as Id<"tickets">,
        signerName,
      });
      // getMyWaivers re-runs reactively -> sheet flips to "signed".
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {waiver ? (
        waiver.signed || open ? (
          <WaiverSheet
            waiver={waiver}
            onSign={handleSign}
            submitting={submitting}
          />
        ) : (
          <Button
            label="Sign waiver"
            variant="ink"
            size="md"
            block
            left={<FileSignature size={18} color={t.paper} />}
            onPress={() => setOpen(true)}
          />
        )
      ) : null}

      {cert ? (
        <Button
          label="View certificate"
          variant="p"
          size="md"
          block
          left={<Award size={18} color={t.accentInk} />}
          onPress={() => router.push(`/certificate/${cert._id}`)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
});
