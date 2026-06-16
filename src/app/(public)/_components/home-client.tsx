"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePreloadedQuery, useQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PosterCard } from "@/components/custom/poster-card";
import { themeForEvent, EVENT_THEMES, THEME_ORDER } from "@/lib/themes";
import type { EventThemeId } from "@/lib/themes";
import { formatCurrency } from "@/lib/utils/format";
import { EVENT_TYPE_FILTERS } from "@/lib/utils/constants";
import {
  Calendar,
  MapPin,
  ChevronRight,
  Sparkles,
  Ticket,
  QrCode,
} from "lucide-react";

const BUNTING_COLORS = ["#EA5A3D", "#FFC53D", "#0E8A6E", "#118AB2"];

const heroDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

function Bunting() {
  return (
    <div className="bunting">
      {Array.from({ length: 24 }).map((_, i) => (
        <i key={i} style={{ background: BUNTING_COLORS[i % 4] }} />
      ))}
    </div>
  );
}

function Ticker({ liveCount }: { liveCount: number }) {
  const base = [
    liveCount > 0 ? `${liveCount} event${liveCount === 1 ? "" : "s"} live` : "New events weekly",
    "Signed QR tickets",
    "Real-time entry tracking",
    "Secure Stripe checkout",
    "Every event its own world",
  ];
  const row = [...base, ...base];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {row.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

type HomeEvent = {
  _id: string;
  title: string;
  date: number;
  time: string;
  eventType: string;
  theme?: string;
  description?: string;
  venueName?: string;
  status: string;
  artworkUrl: string | null;
};

function HeroCard({
  event,
  priceRange,
}: {
  event: HomeEvent;
  priceRange: { minPrice: number; maxPrice: number } | null;
}) {
  const theme = themeForEvent(event);
  const fromPrice =
    priceRange && priceRange.minPrice > 0
      ? formatCurrency(priceRange.minPrice)
      : "Free";

  return (
    <div style={{ position: "relative", paddingBottom: 8 }}>
      <Link className="hero-card" href={`/events/${event._id}`}>
        <div className="art">
          {event.artworkUrl ? (
            <Image
              src={event.artworkUrl}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 920px) 100vw, 45vw"
              priority
            />
          ) : (
            <>
              <div className="grad" style={{ background: theme.grad }} />
              <div className="tex" />
            </>
          )}
          <div className="scrim" />
          <span className="tag feattag">★ Featured</span>
          {event.status === "on_sale" && (
            <span className="tag liveb mono">ON SALE</span>
          )}
          <div className="ph">
            <h3>{event.title}</h3>
            <div className="meta">
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Calendar size={14} />
                {heroDateFormatter.format(event.date)}
              </span>
              {event.venueName && (
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <MapPin size={14} />
                  {event.venueName.split(/,\s*/, 1)[0]}
                </span>
              )}
            </div>
            <div className="buy">
              <div>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    fontFamily: "var(--font-plaza-mono), monospace",
                  }}
                >
                  from
                </div>
                <div className="price">{fromPrice}</div>
              </div>
              <span className="btn btn-p" style={{ padding: "10px 18px" }}>
                Get tickets
              </span>
            </div>
          </div>
        </div>
      </Link>
      <div className="theme-note">
        <span className="dot" style={{ background: theme.primary }} />
        Wears its own <b>“{theme.name}”</b> theme
      </div>
    </div>
  );
}

function GalleryWall() {
  return (
    <section className="sec wrap">
      <div className="gallery">
        <div className="eyebrow">The gallery-wall principle</div>
        <h2>We stay the quiet frame. Every event brings the color.</h2>
        <p>
          PHLive is one calm, trustworthy host. Organizers skin their own event
          pages — gradients, type, motion — and our neutral chrome makes each
          one pop. Same reliable checkout underneath, every time.
        </p>
        <div className="gallery-wall">
          {THEME_ORDER.map((id) => {
            const t = EVENT_THEMES[id];
            return (
              <div className="mini" key={id} title={t.name}>
                <div className="g" style={{ background: t.grad }} />
                <div className="t" />
                <span className="nm">{t.id}</span>
                <span className="lb">{t.name}</span>
              </div>
            );
          })}
        </div>
        <div className="gallery-legend">
          {THEME_ORDER.map((id) => {
            const t = EVENT_THEMES[id];
            return (
              <span className="it" key={id}>
                <span className="sw" style={{ background: t.grad }} />
                {t.name}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OrganizerBand() {
  const [sel, setSel] = useState<EventThemeId>("cosmic");
  return (
    <section className="sec wrap">
      <div className="org">
        <div className="l">
          <div className="eyebrow">For organizers & artists</div>
          <h2>Your event. Your world. Live in minutes.</h2>
          <p>
            Pick a theme, set your tiers, and start selling. You hold the brand
            controls; we hold the checkout — Stripe payments, signed QR
            tickets, and real-time entry tracking included.
          </p>
          <div className="feats">
            <span className="f">
              <Sparkles size={18} /> Visual event themes
            </span>
            <span className="f">
              <Ticket size={18} /> Ticket tiers & promos
            </span>
            <span className="f">
              <QrCode size={18} /> QR entry scanning
            </span>
          </div>
          <div className="ctas">
            <Link className="btn btn-ink btn-lg" href="/dashboard/events/create">
              Start selling
            </Link>
            <Link
              className="btn btn-g btn-lg"
              style={{ borderColor: "#fff", color: "#fff" }}
              href="/sign-up"
            >
              Create account
            </Link>
          </div>
        </div>
        <div className="r">
          <div className="builder">
            <div className="bar">
              <i />
              <i />
              <i />
              <span className="t">theme-builder</span>
            </div>
            <div className="body">
              <div className="lab">Event theme</div>
              <div className="swrow">
                {THEME_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={EVENT_THEMES[id].name}
                    className={"s" + (sel === id ? " on" : "")}
                    style={{ background: EVENT_THEMES[id].grad }}
                    onClick={() => setSel(id)}
                  />
                ))}
              </div>
              <div className="lab">Live preview</div>
              <div className="prev">
                <div className="g" style={{ background: EVENT_THEMES[sel].grad }} />
                <div className="ti">{EVENT_THEMES[sel].name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeClient({
  preloadedEvents,
}: {
  preloadedEvents: Preloaded<typeof api.events.listPublicEvents>;
}) {
  const events = usePreloadedQuery(preloadedEvents) as HomeEvent[];
  const [cat, setCat] = useState("all");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventIds = events?.map((e) => e._id as any as string) ?? [];
  const priceRanges = useQuery(
    api.ticketTiers.getPriceRangeByEventIds,
    eventIds.length > 0 ? { eventIds } : "skip"
  );

  const featured = events?.[0];
  const upcoming = useMemo(() => {
    const base =
      cat === "all" ? events : events.filter((e) => e.eventType === cat);
    return base.slice(0, 6);
  }, [events, cat]);

  return (
    <div>
      <header className="hero wrap">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Ticketing for the Philippine scene</div>
            <h1>
              Where the <span className="u">whole barangay</span> buys tickets.
            </h1>
            <p className="hero-sub">
              From plaza fiestas to arena festivals — every organizer gets a
              poster-perfect page and a checkout that just works.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-p btn-lg" href="/events">
                Find events <ChevronRight size={18} />
              </Link>
              <Link className="btn btn-g btn-lg" href="/dashboard/events/create">
                Sell tickets
              </Link>
            </div>
            <div className="hero-stat">
              <div>
                <div className="n">{events?.length ?? 0}</div>
                <div className="l">live events</div>
              </div>
              <div>
                <div className="n">{THEME_ORDER.length}</div>
                <div className="l">event themes</div>
              </div>
              <div>
                <div className="n">100%</div>
                <div className="l">signed QR entry</div>
              </div>
            </div>
          </div>
          {featured ? (
            <HeroCard
              event={featured}
              priceRange={priceRanges?.[featured._id] ?? null}
            />
          ) : (
            <div style={{ position: "relative", paddingBottom: 8 }}>
              <div className="hero-card">
                <div className="art">
                  <div
                    className="grad"
                    style={{ background: EVENT_THEMES.aurora.grad }}
                  />
                  <div className="tex" />
                  <div className="scrim" />
                  <div className="ph">
                    <h3>Your event here</h3>
                    <div className="meta">
                      <span>Be the first to publish an event</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="theme-note">
                <span
                  className="dot"
                  style={{ background: EVENT_THEMES.aurora.primary }}
                />
                Every event wears its own theme
              </div>
            </div>
          )}
        </div>
      </header>

      <Bunting />
      <div style={{ marginTop: 30 }}>
        <Ticker liveCount={events?.length ?? 0} />
      </div>

      <section className="sec wrap">
        <div className="sec-head">
          <div>
            <div className="eyebrow">Happening soon</div>
            <h2 style={{ marginTop: 10 }}>Upcoming events</h2>
          </div>
          <Link className="link" href="/events">
            Browse all <ChevronRight size={15} />
          </Link>
        </div>
        <div className="cats">
          {EVENT_TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={"cat" + (f.value === cat ? " on" : "")}
              onClick={() => setCat(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {upcoming.length > 0 ? (
          <div className="posters">
            {upcoming.map((event) => (
              <PosterCard
                key={event._id}
                event={event}
                priceRange={priceRanges?.[event._id] ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="bro-empty">
            No {cat === "all" ? "upcoming" : cat} events right now —{" "}
            <button
              type="button"
              onClick={() => setCat("all")}
              style={{
                color: "var(--coral)",
                cursor: "pointer",
                border: "none",
                background: "transparent",
                fontWeight: 800,
                font: "inherit",
              }}
            >
              see all
            </button>
            .
          </div>
        )}
      </section>

      <GalleryWall />
      <OrganizerBand />
    </div>
  );
}
