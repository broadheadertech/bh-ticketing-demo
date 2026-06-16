"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, Stat, Panel, Bars, StatusBadge, EvCell, peso, fmtK } from "./widgets";
import { artistEvents, ARTISTS, ORGANIZERS, grad, artGrad } from "./mock";
import { OrgPayouts } from "./organizer";
import { OrgCalendar } from "./calendar";
import { CreatorPrograms } from "./programs";
import { RosterManager } from "./roster";

const ARTIST_ID = "ridges";

function ArtistOverview({ go }: { go: (p: string) => void }) {
  const a = ARTISTS[ARTIST_ID];
  const shows = artistEvents(ARTIST_ID);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((l, i) => ({ l, v: 200 + ((i * 37) % 80) * 10 }));
  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat icon="heart" color="#EA5A3D" n={a.listeners} label="Monthly listeners" delta="+5.4%" up />
        <Stat icon="user" color="#7C5CFF" n={fmtK(48200)} label="Followers" delta="+1.2k" up />
        <Stat icon="ticket" color="#118AB2" n={shows.length} label="Upcoming shows" />
        <Stat icon="star" color="#FFC53D" n="4.8" label="Avg rating · 312 reviews" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 16 }}>
        <Panel title="Audience growth" link="Followers" onLink={() => go("followers")}><Bars data={months} fmt={(v) => "+" + v} /></Panel>
        <Panel title="Profile health">
          {([["Photo", true], ["Bio", true], ["Socials linked", true], ["Stripe payouts", false], ["Verified badge", false]] as [string, boolean][]).map(([k, ok], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 4 ? "1px solid var(--line-2)" : "none" }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: ok ? "#e6f6ec" : "var(--paper-2)", color: ok ? "var(--green)" : "var(--ink-3)" }}><Icon name={ok ? "check" : "x"} size={13} /></span>
              <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{k}</span>
              {!ok && <button className="btn btn-g btn-sm" onClick={() => go(k === "Stripe payouts" ? "payouts" : "profile")}>Set up</button>}
            </div>
          ))}
        </Panel>
      </div>
      <Panel title="Upcoming shows" link="My shows" onLink={() => go("shows")} style={{ marginTop: 16 }} pad={false}>
        <table className="tbl">
          <thead><tr><th>Show</th><th>Organizer</th><th>Status</th><th>Your cut</th></tr></thead>
          <tbody>
            {shows.map((e) => (
              <tr key={e.id}><td><EvCell title={e.title} grad={grad(e)} sub={`${e.shortDate} · ${e.venue}`} /></td><td>{ORGANIZERS[e.org]?.name}</td><td><StatusBadge s={e._s.status} /></td><td className="mono" style={{ fontWeight: 700 }}>{peso(Math.round(e._s.revenue * 0.4))}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function ArtistShows() {
  const shows = artistEvents(ARTIST_ID);
  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {shows.map((e) => (
          <div className="card" key={e.id} style={{ overflow: "hidden" }}>
            <div style={{ height: 110, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: grad(e) }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))" }} />
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, color: "#fff" }}><div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>{e.title}</div><div style={{ fontSize: 11, opacity: 0.9 }}>{e.shortDate} · {e.venue}</div></div>
            </div>
            <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <StatusBadge s={e._s.status} />
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{e._s.sold} sold</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistProfile() {
  const a = ARTISTS[ARTIST_ID];
  const [name, setName] = useState(a.name);
  const [bio, setBio] = useState(a.bio);
  return (
    <div className="content-wide" style={{ maxWidth: 880 }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 320px", alignItems: "start" }}>
        <Panel>
          <h3 style={{ marginBottom: 16 }}>Edit public profile</h3>
          <div className="fld"><label>Display name</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="fld"><label>Genre / location</label><input className="inp" defaultValue={a.meta} /></div>
          <div className="fld"><label>Bio</label><textarea className="inp" value={bio} onChange={(e) => setBio(e.target.value)} style={{ minHeight: 100 }} /></div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="fld"><label>Instagram</label><input className="inp" placeholder="@theridges" /></div>
            <div className="fld"><label>Spotify</label><input className="inp" placeholder="spotify.com/…" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="fld"><label>Website</label><input className="inp" placeholder="theridges.ph" /></div>
            <div className="fld"><label>Facebook</label><input className="inp" placeholder="fb.com/theridges" /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="btn btn-p"><Icon name="check" size={16} /> Save changes</button>
            <Link className="btn btn-g" href="/"><Icon name="user" size={15} /> View public page</Link>
          </div>
        </Panel>
        <div>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Preview</div>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ height: 120, position: "relative", background: artGrad(a) }}><div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent,rgba(0,0,0,.4))" }} /></div>
            <div style={{ padding: 16, marginTop: -44, position: "relative" }}>
              <span style={{ width: 70, height: 70, borderRadius: 999, display: "block", background: artGrad(a), border: "3px solid var(--card)" }} />
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, marginTop: 10 }}>{name}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{a.meta}</div>
              <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.5 }}>{bio}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>{a.tags.map((tg) => <span key={tg} className="role-chip">{tg}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistFollowers() {
  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Stat icon="user" color="#7C5CFF" n="48,210" label="Total followers" delta="+1.2k" up />
        <Stat icon="pin" color="#0E8A6E" n="Metro Manila" label="Top region · 62%" />
        <Stat icon="heart" color="#EA5A3D" n="18–24" label="Top age group" />
      </div>
      <Panel title="Recent followers" style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {["Liza Cruz", "Marco Reyes", "Anna Lim", "Joce Tan", "Kim Reyes", "Ben Uy"].map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span className="av-mini" style={{ width: 34, height: 34, background: `oklch(0.7 0.16 ${i * 55})` }} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{n}</div><div className="muted" style={{ fontSize: 11 }}>followed {i + 1}d ago</div></div>
              <button className="btn btn-g btn-sm">View</button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function ArtistPages({ page, go }: { page: string; go: (p: string) => void }) {
  if (page === "calendar") return <OrgCalendar />;
  if (page === "programs") return <CreatorPrograms isArtist />;
  if (page === "roster") return <RosterManager />;
  if (page === "shows") return <ArtistShows />;
  if (page === "profile") return <ArtistProfile />;
  if (page === "followers") return <ArtistFollowers />;
  if (page === "payouts") return <OrgPayouts />;
  return <ArtistOverview go={go} />;
}
