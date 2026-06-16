import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

/**
 * Plaza-themed appearance for Clerk components (SignIn / SignUp / UserButton).
 * Maps the TIX.PH "Plaza" design tokens (warm paper, coral accent, hard borders,
 * Bricolage display / Manrope body) onto Clerk's `appearance` API so the auth
 * screens read as part of the same site rather than default Clerk UI.
 *
 * Font vars (--font-display / --font-body) are set on <body> in the root layout,
 * so they resolve wherever a Clerk component is mounted.
 */
type ClerkAppearance = ComponentProps<typeof SignIn>["appearance"];

export const plazaClerkAppearance: ClerkAppearance = {
  variables: {
    colorPrimary: "#EA5A3D",
    colorText: "#17120C",
    colorTextSecondary: "#5B5248",
    colorBackground: "#FFFCF6",
    colorInputBackground: "#FBF6EC",
    colorInputText: "#17120C",
    colorDanger: "#D2452B",
    borderRadius: "12px",
    fontFamily: "var(--font-body), system-ui, sans-serif",
  },
  elements: {
    cardBox: {
      border: "2px solid #17120C",
      borderRadius: "24px",
      boxShadow: "8px 8px 0 #17120C",
      overflow: "hidden",
    },
    card: { backgroundColor: "#FFFCF6" },
    headerTitle: {
      fontFamily: "var(--font-display), system-ui, sans-serif",
      fontWeight: 800,
      letterSpacing: "-0.025em",
    },
    socialButtonsBlockButton: {
      border: "1.5px solid #E4D9C5",
      fontWeight: 700,
    },
    formButtonPrimary: {
      backgroundColor: "#EA5A3D",
      fontFamily: "var(--font-body), system-ui, sans-serif",
      fontWeight: 800,
      fontSize: "15px",
      textTransform: "none",
      boxShadow: "0 8px 22px rgba(234,90,61,.28)",
    },
    formFieldInput: {
      border: "1.5px solid #E4D9C5",
      backgroundColor: "#FBF6EC",
    },
    footerActionLink: { color: "#EA5A3D", fontWeight: 700 },
  },
};
