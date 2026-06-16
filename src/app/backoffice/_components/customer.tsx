"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, Panel, Badge, Empty } from "./widgets";
import { withStats, ARTISTS, ORGANIZERS, grad, artGrad } from "./mock";
import { ROLE_META, type BoRole } from "./shell";
import { CustomerCalendar } from "./calendar";

function QrBox({ size = 76, seed = 7 }: { size?: number; seed?: number }) {
  // deterministic faux-QR (representative keepsake; live QR is the signed code)
  const n = 11;
  const cell = size / n;
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 3 && y < 3) || (x > n - 4 && y < 3) || (x < 3 && y > n - 4);
      if (finder ? (x === 0 || x === n - 1 || y === 0 || y === n - 1 || (x === 1 && y === 1)) || rnd() > 2 : rnd() > 0.5) {
        cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#17120c" />);
      }
    }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: "#fff", borderRadius: 8, border: "1px solid #e7decc" }}>
      {cells}
    </svg>
  );
}

function UserTickets() {
  const [tab, setTab] = useState("upcoming");
  const all = withStats();
  const list = tab === "upcoming" ? all.slice(0, 4) : all.slice(4, 6);
  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">{[["upcoming", "Upcoming"], ["past", "Past"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      </div>
      {list.length ? (
        <div className="wallet">
          {list.map((e) => (
            <div className="wticket" key={e.id} style={{ opacity: tab === "past" ? 0.72 : 1 }}>
              <div className="art">
                <div className="g" style={{ background: grad(e) }} /><div className="tex" /><div className="scrim" />
                <div className="lb"><div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>{e.title}</div><div style={{ fontSize: 11.5, opacity: 0.92 }}>{e.date}</div></div>
              </div>
              <div className="body">
                <span className="qr"><QrBox size={76} seed={e.id.length * 13 + 7} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}><Badge kind="violet">VIP</Badge>{tab === "past" ? <Badge kind="gray">Attended</Badge> : <Badge kind="green">Valid</Badge>}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{e.venue}, {e.city}</div>
                  <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>TIX-26-{e.id.slice(0, 3).toUpperCase()}-7F3A9</div>
                  {tab === "upcoming" && <div style={{ display: "flex", gap: 7, marginTop: 10 }}><button className="btn btn-g btn-sm"><Icon name="transfer" size={13} /> Transfer</button><button className="btn btn-g btn-sm"><Icon name="wallet" size={13} /> Wallet</button></div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <Empty icon="ticket" title="No past events yet" sub="Your attended events will show up here." />}
    </div>
  );
}

function UserFollowing() {
  const arts = Object.values(ARTISTS);
  const orgs = Object.values(ORGANIZERS);
  return (
    <div className="content-wide">
      <Panel title="Artists you follow" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {arts.map((a) => (
            <Link key={a.id} href="/" className="card" style={{ padding: 16, textAlign: "center", display: "block" }}>
              <span style={{ width: 64, height: 64, borderRadius: 999, display: "block", margin: "0 auto", background: artGrad(a), border: "2px solid var(--ink)" }} />
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 10 }}>{a.name}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>{a.listeners} listeners</div>
              <button className="btn btn-g btn-sm" style={{ marginTop: 10, width: "100%" }}>Following</button>
            </Link>
          ))}
        </div>
      </Panel>
      <Panel title="Organizers you follow">
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {orgs.map((o) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 11, background: "var(--ink)", color: "var(--paper)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, flexShrink: 0 }}>{o.name[0]}</span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{o.name}</div><div className="muted" style={{ fontSize: 12 }}>{o.kind} · {o.followers} followers</div></div>
              <button className="btn btn-g btn-sm">Following</button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function UserNotifications() {
  const items: [string, string, string, string, string, boolean][] = [
    ["ticket", "#EA5A3D", "Your tickets are ready", "Sunset Sessions · 2 VIP tickets", "2m ago", true],
    ["spark", "#0E8A6E", "Price drop on a saved event", "Cosmoverse Con early bird ends tonight", "1h ago", true],
    ["music", "#7C5CFF", "The Ridges added a show", "Aurora Music Festival · Jul 5", "5h ago", false],
    ["heart", "#118AB2", "Backspace Live posted an update", "Doors open earlier for Aurora Fest", "1d ago", false],
    ["check", "#0E8A6E", "Refund processed", "₱1,800 back to GCash", "2d ago", false],
  ];
  return (
    <div className="content-wide" style={{ maxWidth: 720 }}>
      <div className="toolbar"><div style={{ flex: 1 }} /><button className="btn btn-g btn-sm">Mark all read</button></div>
      <Panel pad={false}>
        <div>
          {items.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 13, padding: "15px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--line-2)" : "none", background: n[5] ? "color-mix(in oklab, var(--coral) 4%, transparent)" : "transparent" }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: n[1], color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name={n[0]} size={18} /></span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{n[2]}</div><div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{n[3]}</div></div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}><span className="muted mono" style={{ fontSize: 10.5 }}>{n[4]}</span>{n[5] && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--coral)" }} />}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function UserAccount({
  roles,
  onSwitch,
  user,
}: {
  roles: BoRole[];
  onSwitch: (r: BoRole) => void;
  user: { name: string; email: string };
}) {
  return (
    <div className="content-wide" style={{ maxWidth: 760 }}>
      <Panel title="Profile" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <span style={{ width: 64, height: 64, borderRadius: 999, background: "conic-gradient(from 140deg, #EA5A3D, #FFC53D, #0E8A6E, #118AB2, #EA5A3D)", border: "2px solid var(--ink)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 18 }}>{user.name}</div><div className="muted mono" style={{ fontSize: 12.5 }}>{user.email}</div></div>
          <button className="btn btn-g btn-sm"><Icon name="user" size={14} /> Change photo</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="fld"><label>Full name</label><input className="inp" defaultValue={user.name} /></div>
          <div className="fld"><label>Mobile</label><input className="inp" defaultValue="0917 555 0142" /></div>
        </div>
        <button className="btn btn-p"><Icon name="check" size={15} /> Save</button>
      </Panel>

      <Panel title="Your roles" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 14 }}>One account, multiple roles — switch anytime. <span className="mono" style={{ fontSize: 11.5 }}>roles[] · switchRole()</span></p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {(Object.entries(ROLE_META) as [BoRole, (typeof ROLE_META)[BoRole]][]).map(([r, m]) => {
            const has = roles.includes(r);
            return (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1.5px solid var(--line)", borderRadius: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: m.color, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name={m.ic} size={16} /></span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{m.label} <span className="mono muted" style={{ fontSize: 11 }}>· {m.be}</span></div><div className="muted" style={{ fontSize: 12 }}>{has ? m.sub : "Not enabled"}</div></div>
                {has ? <button className="btn btn-g btn-sm" onClick={() => onSwitch(r)}>Switch to</button> : <button className="btn btn-p btn-sm">Enable</button>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "11px 13px", background: "var(--paper-2)", borderRadius: 11, fontSize: 12, color: "var(--ink-3)" }}>
          <Icon name="info" size={14} /> <span><b>Admin</b> can&apos;t be self-enabled — it&apos;s granted by the TIX.PH team.</span>
        </div>
      </Panel>
    </div>
  );
}

export function UserPages({
  page,
  roles,
  onSwitch,
  user,
}: {
  page: string;
  roles: BoRole[];
  onSwitch: (r: BoRole) => void;
  user: { name: string; email: string };
}) {
  if (page === "calendar") return <CustomerCalendar />;
  if (page === "following") return <UserFollowing />;
  if (page === "notifications") return <UserNotifications />;
  if (page === "account") return <UserAccount roles={roles} onSwitch={onSwitch} user={user} />;
  return <UserTickets />;
}
