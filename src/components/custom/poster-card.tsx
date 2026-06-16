"use client";

import Link from "next/link";
import Image from "next/image";
import { themeForEvent } from "@/lib/themes";
import { formatCurrency } from "@/lib/utils/format";
import { EVENT_TYPE_LABELS } from "@/lib/utils/constants";

export type PosterEvent = {
  _id: string;
  title: string;
  date: number;
  eventType: string;
  theme?: string;
  description?: string;
  venueName?: string;
  status: string;
  artworkUrl: string | null;
};

const shortDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

function priceLabel(
  range: { minPrice: number; maxPrice: number } | null | undefined
): string {
  if (!range || range.maxPrice === 0) return "Free";
  if (range.minPrice === 0) return "Free – " + formatCurrency(range.maxPrice);
  return "from " + formatCurrency(range.minPrice);
}

export function PosterCard({
  event,
  priceRange,
}: {
  event: PosterEvent;
  priceRange?: { minPrice: number; maxPrice: number } | null;
}) {
  const theme = themeForEvent(event);
  const isSoldOut = event.status === "sold_out";
  const [venue, city] = (event.venueName ?? "").split(/,\s*/, 2);

  return (
    <Link href={`/events/${event._id}`} className="pcard">
      <div className="frame">
        <div className="art">
          {event.artworkUrl ? (
            <Image
              src={event.artworkUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 540px) 100vw, (max-width: 920px) 50vw, 33vw"
            />
          ) : (
            <>
              <div className="grad" style={{ background: theme.grad }} />
              <div className="tex" />
            </>
          )}
          <div className="scrim" />
          <div className="top">
            <span
              className="tag"
              style={{ background: "var(--mango)", color: "var(--ink)" }}
            >
              {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
            </span>
            <span
              className="tag"
              style={{
                background: isSoldOut ? "var(--coral)" : "rgba(0,0,0,.4)",
                color: "#fff",
                backdropFilter: "blur(4px)",
              }}
            >
              {isSoldOut ? "Sold out" : shortDateFormatter.format(event.date)}
            </span>
          </div>
          <div className="bottom">
            <h3>{event.title}</h3>
            <span className="themechip">
              <span className="d" style={{ background: theme.primary }} />
              {theme.name} theme
            </span>
          </div>
        </div>
      </div>
      <div className="cap">
        <div className="when">
          {venue || shortDateFormatter.format(event.date)}
          {city && <span> · {city}</span>}
        </div>
        <div className="price">{priceLabel(priceRange)}</div>
      </div>
    </Link>
  );
}
