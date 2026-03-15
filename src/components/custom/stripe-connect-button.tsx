"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import {
  createConnectAccount,
  createDashboardLink,
  getStripeAccountStatus,
} from "@/lib/actions/stripe-connect";

export function StripeConnectButton() {
  const user = useQuery(api.users.getCurrentUser);
  const saveStripeAccountId = useMutation(api.stripeConnect.saveStripeAccountId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("stripe_success") === "true") {
      showSuccess("Stripe account connected");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("stripe_success");
      router.replace(
        `/dashboard/settings${params.toString() ? `?${params.toString()}` : ""}`
      );
    }
  }, [searchParams, router]);

  if (user === undefined) {
    return <Skeleton className="h-10 w-48" />;
  }

  function handleConnect() {
    if (!user?.email) return;
    startTransition(async () => {
      try {
        const result = await createConnectAccount(user!.email);
        if (!result.success || !result.data) {
          showErrorFromCatch(new Error(result.error ?? "Failed to connect Stripe"));
          return;
        }
        await saveStripeAccountId({ stripeAccountId: result.data.stripeAccountId });
        window.location.href = result.data.url;
      } catch (err) {
        showErrorFromCatch(err);
      }
    });
  }

  function handleOpenDashboard() {
    if (!user?.stripeAccountId) return;
    startTransition(async () => {
      const result = await createDashboardLink(user!.stripeAccountId!);
      if (!result.success || !result.data) {
        showErrorFromCatch(new Error(result.error ?? "Failed to open Stripe Dashboard"));
        return;
      }
      window.location.href = result.data.url;
    });
  }

  if (user?.stripeAccountId) {
    return (
      <ConnectedState
        stripeAccountId={user.stripeAccountId}
        isPending={isPending}
        onOpenDashboard={handleOpenDashboard}
      />
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isPending}>
      {isPending ? "Connecting..." : "Connect with Stripe"}
    </Button>
  );
}

function ConnectedState({
  stripeAccountId,
  isPending,
  onOpenDashboard,
}: {
  stripeAccountId: string;
  isPending: boolean;
  onOpenDashboard: () => void;
}) {
  const [status, setStatus] = useState<{
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
  } | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStripeAccountStatus(stripeAccountId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        setStatusError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stripeAccountId]);

  return (
    <div className="flex items-center gap-3">
      {statusError ? (
        <Badge variant="secondary">Unknown</Badge>
      ) : status === null ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <Badge variant={status.chargesEnabled ? "default" : "secondary"}>
          {status.chargesEnabled ? "Active" : "Pending setup"}
        </Badge>
      )}
      <Button variant="outline" onClick={onOpenDashboard} disabled={isPending}>
        {isPending ? "Opening..." : "Open Stripe Dashboard"}
      </Button>
    </div>
  );
}
