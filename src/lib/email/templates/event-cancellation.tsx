import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type EventCancellationEmailProps = {
  eventTitle: string;
  eventDate: string;
  cancellationReason?: string;
};

export default function EventCancellationEmail({
  eventTitle,
  eventDate,
  cancellationReason,
}: EventCancellationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Important: {eventTitle} has been cancelled</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Event Cancelled</Heading>

          <Text style={subtitleStyle}>
            We&apos;re sorry to inform you that the following event has been
            cancelled.
          </Text>

          <Hr style={hrStyle} />

          <Section>
            <Text style={labelStyle}>Event</Text>
            <Text style={valueStyle}>{eventTitle}</Text>

            <Text style={labelStyle}>Date</Text>
            <Text style={valueStyle}>{eventDate}</Text>
          </Section>

          {cancellationReason && (
            <>
              <Hr style={hrStyle} />
              <Section>
                <Text style={labelStyle}>Reason</Text>
                <Text style={valueStyle}>{cancellationReason}</Text>
              </Section>
            </>
          )}

          <Hr style={hrStyle} />

          <Section>
            <Text style={refundStyle}>
              If you paid for tickets, refunds will be processed within 5–10
              business days to your original payment method.
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Text style={footerStyle}>
            We apologize for any inconvenience. For questions, contact us at
            support@phlive.app
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
  color: "#ef4444",
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

const refundStyle = {
  fontSize: "15px",
  color: "#0f172a",
  fontWeight: "500",
  margin: "0",
};

const footerStyle = {
  fontSize: "13px",
  color: "#94a3b8",
  margin: "0",
};
