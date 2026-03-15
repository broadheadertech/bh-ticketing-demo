"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { purchaseTickets } from "@/lib/actions/stripe-checkout";
import { Tag, X } from "lucide-react";

type Tier = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  description?: string;
};

export function TicketPurchaseCard({
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
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");

  const promoValidation = useQuery(
    api.promoCodes.validatePromoCode,
    appliedCode
      ? { eventId: eventId as Id<"events">, code: appliedCode }
      : "skip"
  );

  const subtotal = tiers.reduce(
    (sum, tier) => sum + tier.price * (quantities[tier._id] ?? 0),
    0
  );

  // Calculate discounted total
  let total = subtotal;
  if (promoValidation?.valid) {
    if (promoValidation.discountType === "percentage") {
      total = Math.round(subtotal * (1 - promoValidation.discountValue / 100));
    } else {
      // Fixed discount applied per ticket
      const totalDiscount = tiers.reduce((sum, tier) => {
        const qty = quantities[tier._id] ?? 0;
        return sum + Math.min(tier.price, promoValidation.discountValue) * qty;
      }, 0);
      total = subtotal - totalDiscount;
    }
  }

  const totalTickets = Object.values(quantities).reduce((s, q) => s + q, 0);

  function handleQuantityChange(tierId: string, delta: number) {
    const tier = tiers.find((t) => t._id === tierId);
    if (!tier) return;
    const available = tier.quantity - tier.soldCount;
    const current = quantities[tierId] ?? 0;
    const next = Math.max(0, Math.min(available, current + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
  }

  function handleBuyTickets() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/events/${eventId}`);
      return;
    }
    const selections = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ tierId, quantity }));

    startTransition(async () => {
      try {
        const result = await purchaseTickets({
          eventId,
          tierSelections: selections,
          buyerEmail: user!.emailAddresses[0]?.emailAddress ?? "",
          promoCode: appliedCode || undefined,
        });
        if (!result.success || !result.data) {
          showErrorFromCatch(new Error(result.error ?? "Purchase failed"));
          return;
        }
        window.location.href = result.data.url; // external Stripe redirect
      } catch (err) {
        showErrorFromCatch(err);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
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
                  {formatCurrency(tier.price)} · {available} remaining
                </p>
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
        {/* Promo code input */}
        <div className="border-t pt-3 space-y-2">
          {appliedCode && promoValidation?.valid ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Tag className="h-3 w-3 mr-1" />
                  {appliedCode}
                </Badge>
                <span className="text-sm text-green-600">
                  {promoValidation.discountType === "percentage"
                    ? `${promoValidation.discountValue}% off`
                    : `${formatCurrency(promoValidation.discountValue)} off`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setAppliedCode("");
                  setPromoInput("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Promo code"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                className="h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={!promoInput.trim()}
                onClick={() => setAppliedCode(promoInput.trim())}
              >
                Apply
              </Button>
            </div>
          )}
          {appliedCode && promoValidation && !promoValidation.valid && (
            <p className="text-xs text-destructive">{promoValidation.error}</p>
          )}
        </div>

        {subtotal > 0 && (
          <div className="border-t pt-4 space-y-1">
            {appliedCode && promoValidation?.valid && subtotal !== total && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="line-through">{formatCurrency(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
        <Button
          className="w-full"
          onClick={handleBuyTickets}
          disabled={totalTickets === 0 || isPending}
        >
          {isPending
            ? "Processing..."
            : isSignedIn
              ? "Buy Tickets"
              : "Sign in to Buy Tickets"}
        </Button>
      </CardContent>
    </Card>
  );
}
