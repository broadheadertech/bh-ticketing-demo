"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { formatCurrency } from "@/lib/utils/format";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface PromoCodeDialogProps {
  eventId: Id<"events">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoCodeDialog({
  eventId,
  open,
  onOpenChange,
}: PromoCodeDialogProps) {
  const codes = useQuery(
    api.promoCodes.getEventPromoCodes,
    open ? { eventId } : "skip"
  );
  const createPromoCode = useMutation(api.promoCodes.createPromoCode);
  const togglePromoCode = useMutation(api.promoCodes.togglePromoCode);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<string>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!code.trim() || !discountValue) return;
    setIsCreating(true);
    try {
      await createPromoCode({
        eventId,
        code: code.trim(),
        discountType,
        discountValue: Number(discountValue),
        maxUses: maxUses ? Number(maxUses) : undefined,
      });
      showSuccess("Promo code created");
      setCode("");
      setDiscountValue("");
      setMaxUses("");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggle(promoCodeId: Id<"promoCodes">) {
    setTogglingId(promoCodeId);
    try {
      await togglePromoCode({ promoCodeId });
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setTogglingId(null);
    }
  }

  function formatDiscount(type: string, value: number) {
    return type === "percentage" ? `${value}% off` : `${formatCurrency(value)} off`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Promo Codes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create form */}
          <div className="space-y-3 border rounded-lg p-3">
            <p className="text-sm font-medium">Create New Code</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="CODE (e.g. EARLY20)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={20}
                disabled={isCreating}
              />
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={
                  discountType === "percentage"
                    ? "Discount % (e.g. 20)"
                    : "Amount in centavos"
                }
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={isCreating}
              />
              <Input
                placeholder="Max uses (optional)"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!code.trim() || !discountValue || isCreating}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isCreating ? "Creating..." : "Create Code"}
            </Button>
          </div>

          {/* Existing codes */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Active Codes ({codes?.filter((c) => c.isActive).length ?? 0})
            </p>

            {codes === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : codes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No promo codes yet.
              </p>
            ) : (
              codes.map((promo) => (
                <div
                  key={promo._id}
                  className={`flex items-center justify-between border rounded-md p-3 ${
                    !promo.isActive ? "opacity-50" : ""
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">
                        {promo.code}
                      </span>
                      <Badge
                        variant={promo.isActive ? "default" : "outline"}
                        className="text-xs"
                      >
                        {formatDiscount(promo.discountType, promo.discountValue)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used: {promo.usedCount}
                      {promo.maxUses ? ` / ${promo.maxUses}` : " (unlimited)"}
                      {promo.expiresAt &&
                        ` · Expires: ${new Date(promo.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={togglingId === promo._id}
                    onClick={() => handleToggle(promo._id)}
                  >
                    {promo.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
