"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { registerFreeEvent } from "@/lib/actions/free-registration";

type Tier = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  description?: string;
};

export function FreeRegistrationCard({
  eventId,
  tiers,
}: {
  eventId: string;
  tiers: Tier[];
}) {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  const totalTickets = Object.values(quantities).reduce((s, q) => s + q, 0);
  const allFull = tiers.length > 0 && tiers.every((t) => t.soldCount >= t.quantity);

  function handleQuantityChange(tierId: string, delta: number) {
    const tier = tiers.find((t) => t._id === tierId);
    if (!tier) return;
    const available = tier.quantity - tier.soldCount;
    const current = quantities[tierId] ?? 0;
    const next = Math.max(0, Math.min(available, current + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
  }

  function handleRegister() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/events/${eventId}`);
      return;
    }
    const selections = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ tierId, quantity }));

    const buyerEmail = user!.emailAddresses[0]?.emailAddress;
    if (!buyerEmail) {
      showErrorFromCatch(new Error("No email address found on account"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerFreeEvent({
          eventId,
          tierSelections: selections,
          buyerEmail,
        });
        if (!result.success) {
          showErrorFromCatch(new Error(result.error ?? "Registration failed"));
          return;
        }
        showSuccess("Registration confirmed!");
        router.push(`/events/${eventId}/registration-success`);
      } catch (err) {
        showErrorFromCatch(err);
      }
    });
  }

  if (allFull) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled>
            Registration Full
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.map((tier) => {
          const available = tier.quantity - tier.soldCount;
          const qty = quantities[tier._id] ?? 0;
          return (
            <div key={tier._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{tier.name}</p>
                <p className="text-sm text-muted-foreground">
                  Free · {available} remaining
                </p>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(tier._id, -1)}
                  disabled={qty === 0}
                >
                  −
                </Button>
                <span className="w-6 text-center">{qty}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(tier._id, 1)}
                  disabled={qty >= available}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
        <Button
          className="w-full"
          onClick={handleRegister}
          disabled={(isSignedIn && totalTickets === 0) || isPending}
        >
          {isPending
            ? "Registering..."
            : isSignedIn
              ? "Register"
              : "Sign in to Register"}
        </Button>
      </CardContent>
    </Card>
  );
}
