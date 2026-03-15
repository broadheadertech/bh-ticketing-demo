"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { EVENT_TYPE_LABELS } from "@/lib/utils/constants";

type EventCardProps = {
  eventId: string;
  title: string;
  date: number;
  venueName?: string;
  eventType: string;
  status: string;
  artworkUrl: string | null;
  priceRange: { minPrice: number; maxPrice: number } | null;
};

function formatPriceRange(
  range: { minPrice: number; maxPrice: number } | null
): string {
  if (!range) return "Free";
  if (range.minPrice === 0 && range.maxPrice === 0) return "Free";
  if (range.minPrice === 0) return `Free – ${formatCurrency(range.maxPrice)}`;
  if (range.minPrice === range.maxPrice) return formatCurrency(range.minPrice);
  return `From ${formatCurrency(range.minPrice)}`;
}

export function EventCard({
  eventId,
  title,
  date,
  venueName,
  eventType,
  status,
  artworkUrl,
  priceRange,
}: EventCardProps) {
  const isSoldOut = status === "sold_out";
  const priceDisplay = formatPriceRange(priceRange);
  const typeLabel = EVENT_TYPE_LABELS[eventType] ?? eventType;

  return (
    <Link
      href={`/events/${eventId}`}
      aria-label={`${title} on ${formatDate(date)}${venueName ? ` at ${venueName}` : ""} - ${priceDisplay}`}
      className={`group block rounded-lg border bg-card overflow-hidden transition-all duration-200 ${
        isSoldOut
          ? "opacity-70"
          : "hover:shadow-lg hover:-translate-y-1 shadow-md"
      }`}
    >
      {/* Artwork */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {artworkUrl ? (
          <Image
            src={artworkUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-muted-foreground">🎟️</span>
          </div>
        )}
        {/* Sold Out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Sold Out
            </Badge>
          </div>
        )}
        {/* Event type badge — top right */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {typeLabel}
          </Badge>
        </div>
        {/* Date badge — top left */}
        <div className="absolute top-2 left-2">
          <Badge className="text-xs bg-background/90 text-foreground border">
            {formatDate(date)}
          </Badge>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-1">
        <h3 className="text-base font-semibold line-clamp-2 leading-snug">
          {title}
        </h3>
        {venueName && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{venueName}</span>
          </p>
        )}
        <p className="text-sm font-medium text-primary">{priceDisplay}</p>
      </div>
    </Link>
  );
}
