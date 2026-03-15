import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type TicketConfirmationEmailProps = {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName?: string;
  tiers: { name: string; quantity: number }[];
  totalDisplay: string;
  buyerEmail: string;
  /** QR code images to embed in the email — one per ticket */
  qrItems?: { qrDataUrl: string; textCode: string }[];
};

export default function TicketConfirmationEmail({
  eventTitle,
  eventDate,
  eventTime,
  venueName,
  tiers,
  totalDisplay,
  buyerEmail,
  qrItems,
}: TicketConfirmationEmailProps) {
  const isFree = totalDisplay === "Free";

  return (
    <Html>
      <Head />
      <Preview>Your tickets for {eventTitle}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>
            {isFree ? "Registration Confirmed" : "Purchase Confirmed"}
          </Heading>

          <Text style={subtitleStyle}>
            {isFree
              ? "You're registered! Here are your event details."
              : "Payment received. Here are your ticket details."}
          </Text>

          <Hr style={hrStyle} />

          <Section>
            <Text style={labelStyle}>Event</Text>
            <Text style={valueStyle}>{eventTitle}</Text>

            <Text style={labelStyle}>Date</Text>
            <Text style={valueStyle}>{eventDate}</Text>

            <Text style={labelStyle}>Time</Text>
            <Text style={valueStyle}>{eventTime}</Text>

            {venueName && (
              <>
                <Text style={labelStyle}>Venue</Text>
                <Text style={valueStyle}>{venueName}</Text>
              </>
            )}
          </Section>

          <Hr style={hrStyle} />

          <Section>
            <Text style={labelStyle}>Tickets</Text>
            {tiers.map((tier, i) => (
              <Text key={i} style={tierRowStyle}>
                {tier.name} × {tier.quantity}
              </Text>
            ))}
          </Section>

          <Hr style={hrStyle} />

          <Section>
            <Text style={labelStyle}>Total</Text>
            <Text style={totalStyle}>{totalDisplay}</Text>
          </Section>

          <Hr style={hrStyle} />

          {qrItems && qrItems.length > 0 ? (
            <>
              <Section>
                <Text style={labelStyle}>Your QR Codes</Text>
                <Text style={qrNoteStyle}>
                  Present each QR code at the event entrance. One code per
                  ticket.
                </Text>
                {qrItems.map((item, i) => (
                  <Section key={i} style={qrSectionStyle}>
                    <Img
                      src={item.qrDataUrl}
                      width={200}
                      height={200}
                      alt={`Ticket QR code ${i + 1}`}
                    />
                    <Text style={textCodeStyle}>{item.textCode}</Text>
                  </Section>
                ))}
              </Section>
            </>
          ) : null}

          <Hr style={hrStyle} />

          <Text style={footerStyle}>
            Your tickets are registered to {buyerEmail}.
            {(!qrItems || qrItems.length === 0) &&
              " Check your dashboard for ticket QR codes."}
          </Text>

          <Text style={footerStyle}>
            Questions? Contact us at support@phlive.app
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const containerStyle = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 32px",
  maxWidth: "560px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const headingStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 8px 0",
};

const subtitleStyle = {
  fontSize: "15px",
  color: "#64748b",
  margin: "0 0 24px 0",
};

const hrStyle = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
};

const labelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "12px 0 2px 0",
};

const valueStyle = {
  fontSize: "15px",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const tierRowStyle = {
  fontSize: "15px",
  color: "#0f172a",
  margin: "0 0 4px 0",
};

const totalStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0",
};

const footerStyle = {
  fontSize: "13px",
  color: "#94a3b8",
  margin: "0 0 8px 0",
};

const qrSectionStyle = {
  margin: "12px 0",
};

const qrNoteStyle = {
  fontSize: "13px",
  color: "#64748b",
  margin: "4px 0 12px 0",
};

const textCodeStyle = {
  fontSize: "14px",
  fontFamily: "monospace",
  color: "#64748b",
  letterSpacing: "0.1em",
  margin: "4px 0 0 0",
};
