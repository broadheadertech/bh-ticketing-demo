import { SignUp } from "@clerk/nextjs";
import { plazaClerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return <SignUp signInUrl="/sign-in" appearance={plazaClerkAppearance} />;
}
