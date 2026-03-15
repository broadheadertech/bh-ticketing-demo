"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronUp, ChevronDown, Sparkles, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { MAX_TIERS_PER_EVENT, TIER_TEMPLATES } from "@/lib/utils/constants";
import { ticketTierSchema } from "@/lib/validators/ticket-tier";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import type { EventType } from "@/lib/validators/event";

interface TierRow {
  id: string;
  name: string;
  price: number; // centavos
  quantity: number;
  description: string;
  showDescription: boolean;
}

interface TicketTierBuilderProps {
  eventId: string;
  eventType: EventType;
  initialTiers?: Array<{
    name: string;
    price: number;
    quantity: number;
    description?: string;
  }>;
}

function createEmptyTier(): TierRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: 0,
    quantity: 1,
    description: "",
    showDescription: false,
  };
}

export function TicketTierBuilder({
  eventId,
  eventType,
  initialTiers,
}: TicketTierBuilderProps) {
  const [tiers, setTiers] = useState<TierRow[]>(() => {
    if (initialTiers && initialTiers.length > 0) {
      return initialTiers.map((t) => ({
        id: crypto.randomUUID(),
        name: t.name,
        price: t.price,
        quantity: t.quantity,
        description: t.description ?? "",
        showDescription: !!t.description,
      }));
    }
    return [];
  });
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveTiersMutation = useMutation(api.ticketTiers.saveTiers);

  const updateTier = (id: string, field: keyof TierRow, value: string | number | boolean) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    // Clear error for this field
    setErrors((prev) => {
      const tierErrors = { ...prev[id] };
      delete tierErrors[field];
      return { ...prev, [id]: tierErrors };
    });
  };

  const addTier = () => {
    if (tiers.length >= MAX_TIERS_PER_EVENT) return;
    setTiers((prev) => [...prev, createEmptyTier()]);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const moveTier = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tiers.length) return;
    setTiers((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const suggestTiers = () => {
    const templates = TIER_TEMPLATES[eventType] ?? [];
    if (templates.length === 0) return;

    if (tiers.length > 0 && !window.confirm("This will replace your current tiers. Continue?")) {
      return;
    }

    setTiers(
      templates.map((t) => ({
        id: crypto.randomUUID(),
        name: t.name,
        price: t.price,
        quantity: t.quantity,
        description: "",
        showDescription: false,
      }))
    );
    setErrors({});
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let valid = true;

    for (const tier of tiers) {
      const result = ticketTierSchema.safeParse({
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        description: tier.description || undefined,
      });

      if (!result.success) {
        valid = false;
        const tierErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string;
          tierErrors[field] = issue.message;
        }
        newErrors[tier.id] = tierErrors;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (tiers.length === 0) {
      showErrorFromCatch(new Error("Add at least one ticket tier"));
      return;
    }

    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      await saveTiersMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        tiers: tiers.map((t, index) => ({
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          description: t.description || undefined,
          sortOrder: index,
        })),
      });
      showSuccess("Ticket tiers saved successfully");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCapacity = tiers.reduce((sum, t) => sum + t.quantity, 0);
  const totalRevenue = tiers.reduce(
    (sum, t) => sum + t.price * t.quantity,
    0
  );

  const handlePriceChange = (id: string, value: string) => {
    if (value === "" || value === "0") {
      updateTier(id, "price", 0);
      return;
    }
    // Truncate to 2 decimal places before parsing to avoid floating-point drift
    const match = value.match(/^(\d+)(?:\.(\d{0,2}))?/);
    if (!match) return;
    const truncated = match[2] !== undefined ? `${match[1]}.${match[2]}` : match[1];
    const centavos = Math.round(parseFloat(truncated) * 100);
    if (!isNaN(centavos)) {
      updateTier(id, "price", centavos);
    }
  };

  const handleQuantityChange = (id: string, value: string) => {
    const qty = parseInt(value, 10);
    if (!isNaN(qty)) {
      updateTier(id, "quantity", qty);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center gap-3">
        {(TIER_TEMPLATES[eventType]?.length ?? 0) > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={suggestTiers}
            data-testid="suggest-tiers-btn"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Suggest Tiers
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTier}
          disabled={tiers.length >= MAX_TIERS_PER_EVENT}
          data-testid="add-tier-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tier
        </Button>
      </div>

      {/* Tier list */}
      {tiers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No ticket tiers configured yet.</p>
            <p className="text-sm mt-1">
              Click &quot;Add Tier&quot; or &quot;Suggest Tiers&quot; to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <Card key={tier.id} data-testid="tier-row">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Tier {index + 1}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveTier(index, "up")}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveTier(index, "down")}
                      disabled={index === tiers.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeTier(tier.id)}
                      data-testid="remove-tier-btn"
                      aria-label="Remove tier"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`tier-name-${tier.id}`}>Name</Label>
                    <Input
                      id={`tier-name-${tier.id}`}
                      placeholder="e.g. General Admission"
                      value={tier.name}
                      onChange={(e) =>
                        updateTier(tier.id, "name", e.target.value)
                      }
                      data-testid="tier-name-input"
                    />
                    {errors[tier.id]?.name && (
                      <p className="text-sm text-destructive">
                        {errors[tier.id].name}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor={`tier-price-${tier.id}`}>Price (PHP)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        P
                      </span>
                      <Input
                        id={`tier-price-${tier.id}`}
                        type="text"
                        inputMode="decimal"
                        className="pl-7"
                        placeholder="0.00"
                        value={
                          tier.price === 0
                            ? ""
                            : (tier.price / 100).toString()
                        }
                        onChange={(e) =>
                          handlePriceChange(tier.id, e.target.value)
                        }
                        data-testid="tier-price-input"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tier.price === 0
                        ? "Free"
                        : formatCurrency(tier.price)}
                    </p>
                    {errors[tier.id]?.price && (
                      <p className="text-sm text-destructive">
                        {errors[tier.id].price}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor={`tier-qty-${tier.id}`}>Quantity</Label>
                    <Input
                      id={`tier-qty-${tier.id}`}
                      type="number"
                      min={1}
                      value={tier.quantity}
                      onChange={(e) =>
                        handleQuantityChange(tier.id, e.target.value)
                      }
                      data-testid="tier-quantity-input"
                    />
                    {errors[tier.id]?.quantity && (
                      <p className="text-sm text-destructive">
                        {errors[tier.id].quantity}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description toggle */}
                <div className="mt-3">
                  {tier.showDescription ? (
                    <div className="space-y-2">
                      <Label htmlFor={`tier-desc-${tier.id}`}>
                        Description
                      </Label>
                      <Textarea
                        id={`tier-desc-${tier.id}`}
                        placeholder="Optional description for this tier..."
                        value={tier.description}
                        onChange={(e) =>
                          updateTier(tier.id, "description", e.target.value)
                        }
                        rows={2}
                        data-testid="tier-description-input"
                      />
                      {errors[tier.id]?.description && (
                        <p className="text-sm text-destructive">
                          {errors[tier.id].description}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() =>
                        updateTier(tier.id, "showDescription", true)
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Add description
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Running totals */}
      {tiers.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap justify-between gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Capacity:</span>{" "}
                <span className="font-medium" data-testid="total-capacity">
                  {totalCapacity} tickets
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Potential Revenue:
                </span>{" "}
                <span className="font-medium" data-testid="total-revenue">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tiers:</span>{" "}
                <span className="font-medium">
                  {tiers.length} / {MAX_TIERS_PER_EVENT}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSubmitting || tiers.length === 0}
          data-testid="save-tiers-btn"
        >
          {isSubmitting ? "Saving..." : "Save Tiers"}
        </Button>
      </div>
    </div>
  );
}
