import { SignIn } from "@clerk/nextjs";
import { plazaClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return <SignIn signUpUrl="/sign-up" appearance={plazaClerkAppearance} />;
}
