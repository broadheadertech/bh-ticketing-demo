"use client";

import * as React from "react";
import {
  Shield,
  Sparkles,
  Music,
  Ticket,
  LayoutGrid,
  User,
  Map as MapIcon,
  Wallet,
  Info,
  Plus,
  Heart,
  Bell,
  Home,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  SlidersHorizontal,
  ArrowLeftRight,
  Clock,
  Star,
  MapPin,
  Play,
  Upload,
  CalendarDays,
  Gift,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  spark: Sparkles,
  music: Music,
  ticket: Ticket,
  grid: LayoutGrid,
  user: User,
  map: MapIcon,
  wallet: Wallet,
  info: Info,
  plus: Plus,
  heart: Heart,
  bell: Bell,
  home: Home,
  down: ChevronDown,
  up: ChevronUp,
  check: Check,
  x: X,
  chevR: ChevronRight,
  left: ChevronLeft,
  search: Search,
  sliders: SlidersHorizontal,
  transfer: ArrowLeftRight,
  clock: Clock,
  star: Star,
  pin: MapPin,
  play: Play,
  right: ChevronRight,
  share: Upload,
  cal: CalendarDays,
  gift: Gift,
};

export function Icon({
  name,
  size = 18,
  style,
}: {
  name: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const C = ICONS[name] ?? Info;
  return <C size={size} style={style} />;
}

/** Whole-peso formatter (mock data is in pesos; live centavos use formatCurrency). */
export function peso(n: number): string {
  return "₱" + Math.round(n).toLocaleString("en-PH");
}

export function fmtK(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "" + n;
}

export function Stat({
  icon,
  color,
  n,
  label,
  delta,
  up,
}: {
  icon: string;
  color: string;
  n: React.ReactNode;
  label: string;
  delta?: string;
  up?: boolean;
}) {
  return (
    <div className="card stat">
      <div className="top">
        <span className="ic" style={{ background: color }}>
          <Icon name={icon} size={19} />
        </span>
        {delta != null && (
          <span className={"delta " + (up ? "up" : "down")}>
            <Icon name={up ? "up" : "down"} size={13} />
            {delta}
          </span>
        )}
      </div>
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  );
}

export function Panel({
  title,
  link,
  onLink,
  children,
  style,
  pad = true,
}: {
  title?: string;
  link?: string;
  onLink?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  pad?: boolean;
}) {
  return (
    <div className="card" style={style}>
      <div className={pad ? "panel" : ""} style={pad ? {} : { padding: 0 }}>
        {title && (
          <div
            className="panel-head"
            style={pad ? {} : { padding: "18px 20px 0" }}
          >
            <h3>{title}</h3>
            {link && (
              <span className="link" onClick={onLink}>
                {link} <Icon name="chevR" size={13} />
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Bars({
  data,
  fmt,
}: {
  data: { l: string; v: number; alt?: boolean }[];
  fmt?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="chart">
      {data.map((d, i) => (
        <div className="bar" key={i} title={fmt ? fmt(d.v) : "" + d.v}>
          <div
            className={"fill" + (d.alt ? " alt" : "")}
            style={{ height: Math.max(4, (d.v / max) * 100) + "%" }}
          />
          <div className="lb">{d.l}</div>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  segments,
  centerN,
  centerL,
}: {
  segments: { l: string; v: number; c: string }[];
  centerN: React.ReactNode;
  centerL: string;
}) {
  const total = segments.reduce((s, x) => s + x.v, 0) || 1;
  // prefix sums (no outer-variable mutation — keeps the render pure)
  const offsets = segments.map((_, i) =>
    segments.slice(0, i).reduce((s, x) => s + x.v, 0)
  );
  const stops = segments
    .map((s, i) => {
      const a = (offsets[i] / total) * 360;
      const b = ((offsets[i] + s.v) / total) * 360;
      return `${s.c} ${a}deg ${b}deg`;
    })
    .join(", ");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <div className="donut">
        <div className="donut-c" style={{ background: `conic-gradient(${stops})` }}>
          <div className="donut-hole">
            <div className="n">{centerN}</div>
            <div className="l">{centerL}</div>
          </div>
        </div>
      </div>
      <div className="legend-row" style={{ flex: 1 }}>
        {segments.map((s, i) => (
          <div className="it" key={i}>
            <span className="sw" style={{ background: s.c }} />
            {s.l}
            <span className="v">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Badge({
  kind,
  children,
}: {
  kind: string;
  children: React.ReactNode;
}) {
  return <span className={"bdg " + kind}>{children}</span>;
}

const STATUS_BADGE: Record<string, [string, string]> = {
  published: ["green", "Published"],
  on_sale: ["green", "On sale"],
  draft: ["gray", "Draft"],
  pending: ["amber", "Pending review"],
  cancelled: ["red", "Cancelled"],
  sold_out: ["violet", "Sold out"],
  completed: ["blue", "Completed"],
};

export function StatusBadge({ s }: { s: string }) {
  const [k, l] = STATUS_BADGE[s] ?? ["gray", s];
  return <Badge kind={k}>{l}</Badge>;
}

export function EvCell({
  title,
  grad,
  sub,
}: {
  title: string;
  grad: string;
  sub?: string;
}) {
  return (
    <div className="ev-cell">
      <span className="thumb">
        <span className="g" style={{ background: grad }} />
      </span>
      <div>
        <div className="nm">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  title,
  onClose,
  children,
  foot,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <>
      <div className="bo-drawer-scrim" onClick={onClose} />
      <div className="bo-drawer">
        <div className="drawer-head">
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {foot && <div className="drawer-foot">{foot}</div>}
      </div>
    </>
  );
}

export function Empty({
  icon,
  title,
  sub,
  cta,
  onCta,
}: {
  icon?: string;
  title: string;
  sub?: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="empty">
      <div className="ic">
        <Icon name={icon || "info"} size={24} />
      </div>
      <div className="ti">{title}</div>
      {sub && <p style={{ marginTop: 6 }}>{sub}</p>}
      {cta && (
        <button className="btn btn-p" style={{ marginTop: 18 }} onClick={onCta}>
          {cta}
        </button>
      )}
    </div>
  );
}
