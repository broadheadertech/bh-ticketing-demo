import { RoleGuard } from "@/components/custom/role-guard";
import { CreatorProfileForm } from "@/components/custom/creator-profile-form";
import { StripeConnectButton } from "@/components/custom/stripe-connect-button";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your creator profile
      </p>
      <div className="mt-6 space-y-8">
        <RoleGuard requiredRoles={["artist", "organization"]}>
          <CreatorProfileForm />
          <div className="border-t" />
          <div>
            <h2 className="text-lg font-semibold">Payouts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Stripe account to receive ticket sale payouts
            </p>
            <div className="mt-4">
              <StripeConnectButton />
            </div>
          </div>
        </RoleGuard>
      </div>
    </div>
  );
}
