"use client";

import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./widgets";

export type BoRole = "admin" | "organization" | "artist" | "attendee";

export const ROLE_META: Record<
  BoRole,
  { label: string; be: string; color: string; ic: string; sub: string }
> = {
  admin: { label: "Admin", be: "admin", color: "#7C5CFF", ic: "shield", sub: "Platform control" },
  organization: { label: "Organizer", be: "organization", color: "#0E8A6E", ic: "spark", sub: "Your events" },
  artist: { label: "Artist", be: "artist", color: "#EA5A3D", ic: "music", sub: "Your shows" },
  attendee: { label: "Customer", be: "attendee", color: "#118AB2", ic: "ticket", sub: "My tickets" },
};

type NavItem = { id?: string; label?: string; ic?: string; badge?: string; sec?: string };

export const NAV: Record<BoRole, NavItem[]> = {
  admin: [
    { sec: "Platform" },
    { id: "overview", label: "Overview", ic: "grid" },
    { id: "calendar", label: "Calendar", ic: "cal" },
    { id: "moderation", label: "Moderation", ic: "shield", badge: "3" },
    { id: "templates", label: "Venue templates", ic: "map" },
    { sec: "People" },
    { id: "organizers", label: "Organizers", ic: "spark" },
    { id: "artists", label: "Artists", ic: "music" },
    { id: "users", label: "All users", ic: "user" },
    { id: "partners", label: "Partners & promo", ic: "heart" },
    { id: "programs", label: "Programs", ic: "gift" },
    { sec: "Money" },
    { id: "finance", label: "Finance", ic: "wallet" },
    { id: "payouts", label: "Payouts", ic: "wallet" },
    { id: "audit", label: "Audit log", ic: "info" },
  ],
  organization: [
    { sec: "Manage" },
    { id: "overview", label: "Overview", ic: "grid" },
    { id: "calendar", label: "Calendar", ic: "cal" },
    { id: "events", label: "Events", ic: "ticket" },
    { id: "create", label: "Create event", ic: "plus" },
    { id: "venues", label: "Venue maps", ic: "map" },
    { id: "roster", label: "Roster", ic: "user" },
    { id: "attendees", label: "Attendees", ic: "user" },
    { sec: "Grow" },
    { id: "promos", label: "Promo codes", ic: "spark" },
    { id: "programs", label: "Programs", ic: "gift" },
    { id: "payouts", label: "Payouts", ic: "wallet" },
    { id: "team", label: "Team", ic: "shield" },
  ],
  artist: [
    { sec: "Artist" },
    { id: "overview", label: "Overview", ic: "grid" },
    { id: "calendar", label: "Calendar", ic: "cal" },
    { id: "shows", label: "My shows", ic: "ticket" },
    { id: "profile", label: "Public profile", ic: "user" },
    { id: "roster", label: "Roster", ic: "user" },
    { id: "followers", label: "Followers", ic: "heart" },
    { id: "programs", label: "Programs", ic: "gift" },
    { id: "payouts", label: "Payouts", ic: "wallet" },
  ],
  attendee: [
    { sec: "Me" },
    { id: "tickets", label: "My tickets", ic: "ticket" },
    { id: "calendar", label: "Calendar", ic: "cal" },
    { id: "following", label: "Following", ic: "heart" },
    { id: "notifications", label: "Notifications", ic: "bell", badge: "2" },
    { id: "account", label: "Account", ic: "user" },
  ],
};

export const DEFAULT_PAGE: Record<BoRole, string> = {
  admin: "overview",
  organization: "overview",
  artist: "overview",
  attendee: "tickets",
};

export const PAGE_TITLE: Record<BoRole, Record<string, string>> = {
  admin: { overview: "Platform overview", calendar: "Events calendar", moderation: "Event moderation", organizers: "Organizers", artists: "Artists", users: "All users", partners: "Partners & promo", programs: "Programs & sponsorships", templates: "Venue templates", finance: "Finance", payouts: "Payouts", audit: "Audit log" },
  organization: { overview: "Overview", calendar: "Events calendar", events: "Your events", create: "Create event", venues: "Venue maps", roster: "Roster", attendees: "Attendees & check-in", promos: "Promo codes", programs: "Programs", payouts: "Payouts", team: "Team & staff" },
  artist: { overview: "Artist overview", calendar: "Events calendar", shows: "My shows", profile: "Public profile", roster: "Roster", followers: "Followers", programs: "Programs & requests", payouts: "Payouts" },
  attendee: { tickets: "My tickets", calendar: "Events calendar", following: "Following", notifications: "Notifications", account: "Account" },
};

function RoleSwitcher({
  role,
  roles,
  onSwitch,
}: {
  role: BoRole;
  roles: BoRole[];
  onSwitch: (r: BoRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const m = ROLE_META[role];
  return (
    <div className="rolesw">
      <button className="rolesw-btn" onClick={() => setOpen((o) => !o)}>
        <span className="ic" style={{ background: m.color }}>
          <Icon name={m.ic} size={17} style={{ color: "#fff" }} />
        </span>
        <span className="lab">
          <div className="r">{m.label}</div>
          <div className="s">{m.be}</div>
        </span>
        <Icon name={open ? "up" : "down"} size={15} style={{ color: "#9b8f7a" }} />
      </button>
      {open && (
        <div className="rolesw-menu" onMouseLeave={() => setOpen(false)}>
          <div className="rolesw-cap">Switch role · switchRole()</div>
          {roles.map((r) => {
            const rm = ROLE_META[r];
            if (!rm) return null;
            return (
              <div
                key={r}
                className={"rolesw-item" + (r === role ? " on" : "")}
                onClick={() => {
                  onSwitch(r);
                  setOpen(false);
                }}
              >
                <span className="ic" style={{ background: rm.color }}>
                  <Icon name={rm.ic} size={14} style={{ color: "#fff" }} />
                </span>
                <div style={{ flex: 1 }}>
                  <div className="r">{rm.label}</div>
                  <div className="s">{rm.sub}</div>
                </div>
                {r === role && <Icon name="check" size={14} style={{ color: rm.color }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  role,
  roles,
  page,
  setPage,
  onSwitch,
  user,
}: {
  role: BoRole;
  roles: BoRole[];
  page: string;
  setPage: (p: string) => void;
  onSwitch: (r: BoRole) => void;
  user: { name: string; email: string };
}) {
  const items = NAV[role];
  return (
    <aside className="side">
      <div className="side-logo">
        <span className="m" />
        <div>
          <div className="t">TIX.PH</div>
          <div className="bo-tag">Back office</div>
        </div>
      </div>
      <RoleSwitcher role={role} roles={roles} onSwitch={onSwitch} />
      <nav className="side-nav">
        {items.map((it, i) =>
          it.sec ? (
            <div className="side-sec" key={"s" + i}>
              {it.sec}
            </div>
          ) : (
            <button
              key={it.id}
              className={"nav-i" + (page === it.id ? " on" : "")}
              onClick={() => setPage(it.id!)}
            >
              <Icon name={it.ic!} size={18} />
              {it.label}
              {it.badge && <span className="badge">{it.badge}</span>}
            </button>
          )
        )}
      </nav>
      <div className="side-foot">
        <Link className="side-link" href="/">
          <Icon name="home" size={16} /> View live site
        </Link>
        <div className="acct">
          <span
            className="av"
            style={{
              background:
                "conic-gradient(from 140deg, #EA5A3D, #FFC53D, #0E8A6E, #118AB2, #EA5A3D)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{user.name}</div>
            <div className="em">{user.email}</div>
          </div>
          <Icon name="down" size={15} style={{ color: "#9b8f7a" }} />
        </div>
      </div>
    </aside>
  );
}

export function Topbar({
  title,
  crumb,
  actions,
}: {
  title: string;
  crumb?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1>{title}</h1>
        {crumb && <div className="crumb">{crumb}</div>}
      </div>
      <div style={{ flex: 1 }} />
      <div className="top-search">
        <Icon name="search" size={16} />
        <input placeholder="Search…" />
      </div>
      <button className="icon-btn">
        <Icon name="bell" size={18} />
        <span className="dot" />
      </button>
      {actions}
    </div>
  );
}
