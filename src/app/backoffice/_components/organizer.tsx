"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { EVENT_THEMES, THEME_ORDER } from "@/lib/themes";
import { kitFor } from "@/lib/event-kits";
import { EVENT_TYPES, EVENT_TYPE_LABELS } from "@/lib/utils/constants";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { Icon, Stat, Panel, Bars, StatusBadge, Badge, EvCell, peso, fmtK } from "./widgets";
import { orgEvents, ORGANIZERS, grad, type BoEventWithStats } from "./mock";
import { VenueEditor } from "./venue-editor";
import { OrgCalendar } from "./calendar";
import { CreatorPrograms } from "./programs";
import { RosterManager } from "./roster";

type RosterItem = { _id: string; name: string; role: string | null };

const ORG_ID = "backspace";

function OrgOverview({ go }: { go: (p: string) => void }) {
  const evs = orgEvents(ORG_ID);
  const revenue = evs.reduce((s, e) => s + e._s.revenue, 0);
  const sold = evs.reduce((s, e) => s + e._s.sold, 0);
  const live = evs.filter((e) => e._s.status === "published").length;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((l, i) => ({
    l,
    v: Math.round((revenue / 6) * (0.5 + ((i * 5) % 11) / 10)),
  }));
  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat icon="wallet" color="#0E8A6E" n={peso(revenue)} label="Revenue (90d)" delta="+18%" up />
        <Stat icon="ticket" color="#EA5A3D" n={fmtK(sold)} label="Tickets sold" delta="+12%" up />
        <Stat icon="grid" color="#118AB2" n={`${live} live`} label={`${evs.length} events total`} />
        <Stat icon="heart" color="#7C5CFF" n={ORGANIZERS[ORG_ID].followers} label="Followers" delta="+340" up />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 16 }}>
        <Panel title="Sales trend" link="All events" onLink={() => go("events")}>
          <Bars data={months} fmt={peso} />
        </Panel>
        <Panel title="Recent sales">
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {evs.slice(0, 4).map((e, i) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, position: "relative", overflow: "hidden", border: "1px solid var(--line)" }}>
                  <span style={{ position: "absolute", inset: 0, background: grad(e) }} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{e.title}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{2 + i} tickets · {i + 1}m ago</div>
                </div>
                <span className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: "var(--green)" }}>
                  +{peso(e.from * (2 + i))}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Your events" link="Manage" onLink={() => go("events")} style={{ marginTop: 16 }} pad={false}>
        <table className="tbl">
          <thead><tr><th>Event</th><th>Status</th><th>Sold</th><th>Revenue</th><th>Capacity</th></tr></thead>
          <tbody>
            {evs.map((e) => (
              <tr key={e.id} className="row-click" onClick={() => go("attendees")}>
                <td><EvCell title={e.title} grad={grad(e)} sub={`${e.shortDate} · ${e.venue}`} /></td>
                <td><StatusBadge s={e._s.status} /></td>
                <td className="mono">{e._s.sold}/{e._s.cap}</td>
                <td className="mono" style={{ fontWeight: 700 }}>{peso(e._s.revenue)}</td>
                <td style={{ width: 150 }}><div className="prog"><div className="v" style={{ width: Math.round(e._s.pct * 100) + "%" }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function OrgEvents({ go }: { go: (p: string) => void }) {
  const [tab, setTab] = useState("all");
  const evs = orgEvents(ORG_ID).filter((e) => tab === "all" || e._s.status === tab);
  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">
          {[["all", "All"], ["published", "Live"], ["draft", "Drafts"], ["pending", "Pending"]].map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-p" onClick={() => go("create")}><Icon name="plus" size={16} /> Create event</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {evs.map((e) => (
          <div className="card" key={e.id} style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => go("attendees")}>
            <div style={{ height: 120, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: grad(e) }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))" }} />
              <div style={{ position: "absolute", top: 10, left: 10 }}><StatusBadge s={e._s.status} /></div>
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, color: "#fff" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>{e.title}</div>
                <div style={{ fontSize: 11.5, opacity: 0.9 }}>{e.shortDate} · {e.venue}</div>
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>{e._s.sold} / {e._s.cap} sold</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{peso(e._s.revenue)}</span>
              </div>
              <div className="prog"><div className="v" style={{ width: Math.round(e._s.pct * 100) + "%" }} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateEvent({ go }: { go: (p: string) => void }) {
  const createEvent = useMutation(api.events.createEvent);
  const saveTiers = useMutation(api.ticketTiers.saveTiers);
  const saveAddOns = useMutation(api.addOns.saveAddOns);
  const createParticipant = useMutation(api.participants.create);
  const roster = (useQuery(api.participants.listMine) ?? []) as RosterItem[];
  const [addingParticipant, setAddingParticipant] = useState(false);

  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<(typeof THEME_ORDER)[number]>("aurora");
  const [hero, setHero] = useState("gradient");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("concert");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [lineup, setLineup] = useState<string[]>([]);
  const [doorsTime, setDoorsTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationType, setLocationType] = useState("venue");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [onSaleStart, setOnSaleStart] = useState("");
  const [onSaleEnd, setOnSaleEnd] = useState("");
  const [maxPerOrder, setMaxPerOrder] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [ageRestriction, setAgeRestriction] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [goodToKnow, setGoodToKnow] = useState("");
  const [artistQ, setArtistQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [days, setDays] = useState<
    { label: string; date: string; startTime: string; endTime: string }[]
  >([]);
  const [tiers, setTiers] = useState<
    { name: string; price: number; qty: number; dayId?: string }[]
  >([
    { name: "Early Bird", price: 800, qty: 100 },
    { name: "General Admission", price: 1200, qty: 400 },
    { name: "VIP", price: 3500, qty: 80 },
  ]);
  const [addOns, setAddOns] = useState<{ name: string; price: string; qty: string }[]>([]);
  const [questions, setQuestions] = useState<
    { label: string; type: string; required: boolean; options: string }[]
  >([]);
  const t = EVENT_THEMES[theme];
  const steps = ["Basics", "Theme", "Tickets", "Review"];
  const previewTitle = title || "Your Event Title";
  const setTier = (i: number, k: string, v: string) =>
    setTiers((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addTier = () => setTiers((p) => [...p, { name: "New tier", price: 500, qty: 100 }]);
  const delTier = (i: number) => setTiers((p) => p.filter((_, j) => j !== i));
  const totalCap = tiers.reduce((s, x) => s + (+x.qty || 0), 0);
  const potential = tiers.reduce((s, x) => s + (+x.qty || 0) * (+x.price || 0), 0);
  const toggleArtist = (id: string) =>
    setLineup((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const addParticipant = async () => {
    const name = artistQ.trim();
    if (!name) return;
    setAddingParticipant(true);
    try {
      const id = await createParticipant({ name, role: kitFor(type).participantsSingular });
      setLineup((p) => [...p, String(id)]);
      setArtistQ("");
    } catch (e) {
      showErrorFromCatch(e);
    } finally {
      setAddingParticipant(false);
    }
  };

  const enableMultiDay = (on: boolean) => {
    setMultiDay(on);
    if (on && days.length === 0) {
      setDays([
        { label: "Day 1", date, startTime: time, endTime: "" },
        { label: "Day 2", date: "", startTime: time, endTime: "" },
      ]);
    }
  };
  const setDay = (i: number, k: string, v: string) =>
    setDays((p) => p.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  const addDay = () =>
    setDays((p) => [...p, { label: `Day ${p.length + 1}`, date: "", startTime: "19:00", endTime: "" }]);
  const delDay = (i: number) => setDays((p) => p.filter((_, j) => j !== i));
  const setTierDay = (i: number, v: string) =>
    setTiers((p) => p.map((x, j) => (j === i ? { ...x, dayId: v } : x)));
  const addAddOn = () => setAddOns((p) => [...p, { name: "", price: "", qty: "" }]);
  const setAddOnF = (i: number, k: string, v: string) =>
    setAddOns((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const delAddOn = (i: number) => setAddOns((p) => p.filter((_, j) => j !== i));
  const addQ = () => setQuestions((p) => [...p, { label: "", type: "text", required: false, options: "" }]);
  const setQF = (i: number, k: string, v: string | boolean) =>
    setQuestions((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const delQ = (i: number) => setQuestions((p) => p.filter((_, j) => j !== i));

  const haveWhen = multiDay ? days.length > 0 && days.every((d) => d.date) : !!date;
  const canContinue = step !== 0 || (title.trim() && haveWhen);

  const publish = async () => {
    if (!title.trim() || !haveWhen) {
      showErrorFromCatch(new Error("Title and date(s) are required"));
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const toMs = (s: string) => {
        if (!s) return undefined;
        const ms = new Date(s).getTime();
        return isNaN(ms) ? undefined : ms;
      };
      // Build the day list (multi-day) or fall back to the single date/time.
      const daysArr = multiDay
        ? days.map((d, i) => ({
            id: `d${i + 1}`,
            label: d.label.trim() || `Day ${i + 1}`,
            date: new Date(d.date + "T00:00:00").getTime(),
            startTime: d.startTime || undefined,
            endTime: d.endTime || undefined,
          }))
        : undefined;
      const dateMs = multiDay
        ? (daysArr as { date: number }[])[0].date
        : new Date(date + "T00:00:00").getTime();
      const timeVal = multiDay ? days[0].startTime || "19:00" : time;
      const eventId = await createEvent({
        eventType: type,
        theme,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        participantIds: lineup as any,
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || "Details coming soon.",
        date: dateMs,
        time: timeVal,
        endTime: !multiDay && endTime ? endTime : undefined,
        doorsTime: !multiDay && doorsTime ? doorsTime : undefined,
        days: daysArr,
        venueName: venue.trim() || undefined,
        city: city.trim() || undefined,
        locationType: locationType || undefined,
        onlineUrl: onlineUrl.trim() || undefined,
        onSaleStart: toMs(onSaleStart),
        onSaleEnd: toMs(onSaleEnd),
        maxPerOrder: maxPerOrder ? Number(maxPerOrder) : undefined,
        visibility: visibility || undefined,
        refundPolicy: refundPolicy.trim() || undefined,
        ageRestriction: ageRestriction.trim() || undefined,
        goodToKnow: goodToKnow.trim() || undefined,
        registrationQuestions: questions
          .filter((q) => q.label.trim())
          .map((q, i) => ({
            id: `q${i + 1}`,
            label: q.label.trim(),
            type: q.type,
            options:
              q.type === "select"
                ? q.options.split(",").map((s) => s.trim()).filter(Boolean)
                : undefined,
            required: q.required,
          })),
      });
      const cleanTiers = tiers
        .filter((tr) => tr.name.trim())
        .map((tr, i) => ({
          name: tr.name.trim(),
          price: Math.round((+tr.price || 0) * 100), // ₱ → centavos
          quantity: +tr.qty || 0,
          dayId: multiDay && tr.dayId ? tr.dayId : undefined, // undefined = full-event pass
          sortOrder: i,
        }));
      if (cleanTiers.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await saveTiers({ eventId: eventId as any, tiers: cleanTiers });
      }
      const cleanAddOns = addOns
        .filter((a) => a.name.trim())
        .map((a, i) => ({
          name: a.name.trim(),
          price: Math.round((+a.price || 0) * 100),
          quantity: a.qty ? Number(a.qty) : undefined,
          sortOrder: i,
        }));
      if (cleanAddOns.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await saveAddOns({ eventId: eventId as any, addOns: cleanAddOns });
      }
      showSuccess("Event created as draft");
      go("events");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="content-wide" style={{ maxWidth: 980 }}>
      <div className="stepper">
        {steps.map((s, i) => (
          <div key={s} className={"st" + (i === step ? " on" : i < step ? " done" : "")}>
            <div className="bar" />
            <div className="lb">{i < step && <Icon name="check" size={13} style={{ color: "var(--coral)" }} />}{s}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 380px", alignItems: "start" }}>
        <Panel>
          {step === 0 && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Event basics</h3>
              <div className="fld"><label>Event title</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midnight Bloom Fest" /></div>
              <div className="fld"><label>Tagline</label><input className="inp" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line for cards & hero" /></div>
              <div className="grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end", gap: 12 }}>
                <div className="fld" style={{ margin: 0 }}><label>Type</label>
                  <select className="inp" value={type} onChange={(e) => setType(e.target.value)}>
                    {EVENT_TYPES.map((x) => <option key={x} value={x}>{EVENT_TYPE_LABELS[x] ?? x}</option>)}
                  </select>
                </div>
                <button type="button" className={"btn btn-sm " + (multiDay ? "btn-ink" : "btn-g")} onClick={() => enableMultiDay(!multiDay)}>
                  <Icon name="cal" size={14} /> {multiDay ? "Multi-day ✓" : "Single day"}
                </button>
              </div>

              {!multiDay ? (
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 12 }}>
                  <div className="fld"><label>Date</label><input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div className="fld"><label>Time</label><input className="inp" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
                  <div className="fld"><label>Doors</label><input className="inp" type="time" value={doorsTime} onChange={(e) => setDoorsTime(e.target.value)} /></div>
                  <div className="fld"><label>End</label><input className="inp" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                </div>
              ) : (
                <div className="fld" style={{ marginTop: 12 }}>
                  <label>Event days</label>
                  {days.map((d, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr .9fr .9fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input className="inp" value={d.label} onChange={(e) => setDay(i, "label", e.target.value)} placeholder={`Day ${i + 1}`} />
                      <input className="inp" type="date" value={d.date} onChange={(e) => setDay(i, "date", e.target.value)} />
                      <input className="inp" type="time" value={d.startTime} onChange={(e) => setDay(i, "startTime", e.target.value)} />
                      <input className="inp" type="time" value={d.endTime} onChange={(e) => setDay(i, "endTime", e.target.value)} />
                      <button type="button" onClick={() => delDay(i)} disabled={days.length <= 1} style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid var(--line)", background: "transparent", cursor: days.length <= 1 ? "not-allowed" : "pointer", color: "var(--ink-3)", display: "grid", placeItems: "center", opacity: days.length <= 1 ? 0.4 : 1 }}><Icon name="x" size={15} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-g btn-sm" onClick={addDay} style={{ marginTop: 2 }}><Icon name="plus" size={14} /> Add day</button>
                </div>
              )}
              <div className="fld"><label>Location type</label>
                <select className="inp" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                  <option value="venue">In-person venue</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              {(locationType === "online" || locationType === "hybrid") && (
                <div className="fld"><label>Online / stream URL</label><input className="inp" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} placeholder="https://…" /></div>
              )}
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="fld"><label>Venue</label><input className="inp" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="SM MOA Arena" /></div>
                <div className="fld"><label>City</label><input className="inp" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Pasay City" /></div>
              </div>
              <div className="fld"><label>Description</label><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell fans what to expect…" /></div>
              <div className="fld" style={{ marginBottom: 0 }}>
                <label>{kitFor(type).participantsLabel} <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                {lineup.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {lineup.map((id) => {
                      const a = roster.find((x) => String(x._id) === id);
                      return <span key={id} className="role-chip" style={{ cursor: "pointer" }} onClick={() => toggleArtist(id)}>{a?.name ?? "—"} ✕</span>;
                    })}
                  </div>
                )}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
                  <input className="inp" style={{ paddingLeft: 32 }} value={artistQ} onChange={(e) => setArtistQ(e.target.value)} placeholder={kitFor(type).searchPlaceholder} />
                </div>
                {(() => {
                  const ql = artistQ.trim().toLowerCase();
                  const shown = roster.filter((a) => !ql || a.name.toLowerCase().includes(ql));
                  const exact = roster.some((a) => a.name.toLowerCase() === ql);
                  return (
                    <>
                      <div style={{ maxHeight: 132, overflowY: "auto", border: "1.5px solid var(--line)", borderRadius: 11 }}>
                        {shown.length === 0 ? (
                          <p className="muted" style={{ fontSize: 12.5, padding: 10 }}>
                            {roster.length === 0 ? "Your roster is empty — add someone below." : `No match for “${artistQ}”.`}
                          </p>
                        ) : (
                          shown.map((a) => {
                            const id = String(a._id);
                            const on = lineup.includes(id);
                            return (
                              <button key={id} type="button" onClick={() => toggleArtist(id)} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: "none", background: on ? "var(--paper-2)" : "transparent", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "var(--ink)", textAlign: "left", borderBottom: "1px solid var(--line-2)" }}>
                                <span><b>{a.name}</b>{a.role && <span className="muted" style={{ fontSize: 11.5 }}> · {a.role}</span>}</span>
                                {on && <Icon name="check" size={15} style={{ color: "var(--coral)" }} />}
                              </button>
                            );
                          })
                        )}
                      </div>
                      {ql && !exact && (
                        <button type="button" className="btn btn-g btn-sm" style={{ marginTop: 8 }} disabled={addingParticipant} onClick={addParticipant}>
                          <Icon name="plus" size={14} /> Add “{artistQ.trim()}” as {kitFor(type).participantsSingular}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h3>Theme builder</h3>
              <p className="muted" style={{ fontSize: 13, margin: "6px 0 16px" }}>Skin your event&apos;s public page. Maps to <span className="mono" style={{ fontSize: 12 }}>events.theme</span> — checkout stays neutral.</p>
              <label style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink-2)", display: "block", marginBottom: 8 }}>Theme preset</label>
              <div className="tb-swatches">
                {THEME_ORDER.map((id) => (
                  <div key={id} className={"tb-sw" + (theme === id ? " on" : "")} onClick={() => setTheme(id)}>
                    <div className="pv" style={{ background: EVENT_THEMES[id].grad }} />
                    <div className="nm">{EVENT_THEMES[id].name}</div>
                  </div>
                ))}
              </div>
              <label style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink-2)", display: "block", margin: "20px 0 8px" }}>Hero layout</label>
              <div className="segtabs" style={{ display: "flex" }}>
                {[["gradient", "Gradient"], ["image", "Full image"], ["video", "Video loop"]].map(([k, l]) => (
                  <button key={k} className={hero === k ? "on" : ""} onClick={() => setHero(k)} style={{ flex: 1 }}>{l}</button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: 4 }}>Ticket tiers</h3>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Prices in ₱ · stored as centavos. <span className="mono" style={{ fontSize: 12 }}>ticketTiers</span></p>
              {multiDay && (
                <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Assign each tier to a day, or “All days” for a full-event pass.</p>
              )}
              {tiers.map((tr, i) => (
                <div className="tier-row" key={i} style={multiDay ? { gridTemplateColumns: "1.2fr .7fr .7fr .9fr auto" } : undefined}>
                  <input className="inp" value={tr.name} onChange={(e) => setTier(i, "name", e.target.value)} />
                  <input className="inp" type="number" value={tr.price} onChange={(e) => setTier(i, "price", e.target.value)} />
                  <input className="inp" type="number" value={tr.qty} onChange={(e) => setTier(i, "qty", e.target.value)} />
                  {multiDay && (
                    <select className="inp" value={tr.dayId ?? ""} onChange={(e) => setTierDay(i, e.target.value)}>
                      <option value="">All days</option>
                      {days.map((d, di) => <option key={di} value={`d${di + 1}`}>{d.label || `Day ${di + 1}`}</option>)}
                    </select>
                  )}
                  <button className="del" onClick={() => delTier(i)}><Icon name="x" size={15} /></button>
                </div>
              ))}
              <button className="btn btn-g btn-sm" onClick={addTier} style={{ marginTop: 4 }}><Icon name="plus" size={14} /> Add tier</button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, padding: "14px 16px", background: "var(--paper-2)", borderRadius: 12 }}>
                <span className="muted" style={{ fontSize: 13 }}>Capacity <b style={{ color: "var(--ink)" }}>{totalCap.toLocaleString()}</b></span>
                <span className="muted" style={{ fontSize: 13 }}>Potential gross <b style={{ color: "var(--ink)" }}>{peso(potential)}</b></span>
              </div>

              <h3 style={{ margin: "24px 0 4px" }}>Add-ons <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>(optional extras: parking, merch, meals…)</span></h3>
              <div style={{ marginTop: 12 }}>
                {addOns.map((a, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr .7fr .7fr auto", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <input className="inp" value={a.name} onChange={(e) => setAddOnF(i, "name", e.target.value)} placeholder="e.g. Parking pass" />
                    <input className="inp" type="number" value={a.price} onChange={(e) => setAddOnF(i, "price", e.target.value)} placeholder="₱" />
                    <input className="inp" type="number" value={a.qty} onChange={(e) => setAddOnF(i, "qty", e.target.value)} placeholder="Qty (∞)" />
                    <button className="del" onClick={() => delAddOn(i)} style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid var(--line)", background: "transparent", cursor: "pointer", color: "var(--ink-3)", display: "grid", placeItems: "center" }}><Icon name="x" size={15} /></button>
                  </div>
                ))}
                <button className="btn btn-g btn-sm" onClick={addAddOn}><Icon name="plus" size={14} /> Add add-on</button>
              </div>

              <h3 style={{ margin: "24px 0 4px" }}>Registration questions <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>(asked at checkout)</span></h3>
              <div style={{ marginTop: 12 }}>
                {questions.map((q, i) => (
                  <div key={i} style={{ border: "1.5px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.6fr .9fr auto auto", gap: 10, alignItems: "center" }}>
                      <input className="inp" value={q.label} onChange={(e) => setQF(i, "label", e.target.value)} placeholder="e.g. T-shirt size" />
                      <select className="inp" value={q.type} onChange={(e) => setQF(i, "type", e.target.value)}>
                        <option value="text">Short text</option>
                        <option value="select">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={q.required} onChange={(e) => setQF(i, "required", e.target.checked)} /> Required
                      </label>
                      <button className="del" onClick={() => delQ(i)} style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid var(--line)", background: "transparent", cursor: "pointer", color: "var(--ink-3)", display: "grid", placeItems: "center" }}><Icon name="x" size={15} /></button>
                    </div>
                    {q.type === "select" && (
                      <input className="inp" style={{ marginTop: 8 }} value={q.options} onChange={(e) => setQF(i, "options", e.target.value)} placeholder="Options, comma-separated: S, M, L, XL" />
                    )}
                  </div>
                ))}
                <button className="btn btn-g btn-sm" onClick={addQ}><Icon name="plus" size={14} /> Add question</button>
              </div>

              <h3 style={{ margin: "24px 0 4px" }}>Sales settings</h3>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                <div className="fld"><label>Max tickets / order</label><input className="inp" type="number" min={1} value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value)} placeholder="e.g. 8" /></div>
                <div className="fld"><label>Visibility</label>
                  <select className="inp" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="public">Public — listed in Browse</option>
                    <option value="unlisted">Unlisted — link only</option>
                  </select>
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="fld"><label>Sales open</label><input className="inp" type="datetime-local" value={onSaleStart} onChange={(e) => setOnSaleStart(e.target.value)} /></div>
                <div className="fld"><label>Sales close</label><input className="inp" type="datetime-local" value={onSaleEnd} onChange={(e) => setOnSaleEnd(e.target.value)} /></div>
              </div>

              <h3 style={{ margin: "20px 0 4px" }}>Policies &amp; good to know</h3>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                <div className="fld"><label>Age restriction</label><input className="inp" value={ageRestriction} onChange={(e) => setAgeRestriction(e.target.value)} placeholder="e.g. 18+, All ages" /></div>
                <div className="fld"><label>Refund policy</label><input className="inp" value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} placeholder="e.g. No refunds; transfers ok" /></div>
              </div>
              <div className="fld" style={{ marginBottom: 0 }}><label>Good to know</label><textarea className="inp" value={goodToKnow} onChange={(e) => setGoodToKnow(e.target.value)} placeholder="Doors, re-entry, what to bring, parking…" /></div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: 16 }}>Review &amp; create</h3>
              {([
                ["Title", previewTitle],
                ["Type", EVENT_TYPE_LABELS[type] ?? type],
                ["Date", date || "—"],
                ["Venue", [venue, city].filter(Boolean).join(", ") || "—"],
                ["Theme", t.name + " · " + hero],
                ["Lineup", lineup.length ? `${lineup.length} artist${lineup.length === 1 ? "" : "s"}` : "None"],
                ["Tiers", tiers.length + " tiers"],
                ["Capacity", totalCap.toLocaleString()],
                ["Potential gross", peso(potential)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line-2)" }}>
                  <span className="muted" style={{ fontSize: 13.5 }}>{k}</span><span style={{ fontWeight: 700, fontSize: 14 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 18, padding: "12px 14px", background: "#e6f6ec", borderRadius: 12, fontSize: 12.5, color: "var(--green)" }}>
                <Icon name="info" size={15} /> Saved as a draft — publish it from Events when you&apos;re ready.
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {step > 0 && <button className="btn btn-g" onClick={() => setStep((s) => s - 1)}><Icon name="left" size={15} /> Back</button>}
            <div style={{ flex: 1 }} />
            {step < 3
              ? <button className="btn btn-p" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>Continue <Icon name="chevR" size={15} /></button>
              : <button className="btn btn-p" disabled={busy} onClick={publish}><Icon name="check" size={16} /> {busy ? "Creating…" : "Create event"}</button>}
          </div>
        </Panel>
        <div style={{ position: "sticky", top: 0 }}>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Live preview</div>
          <div className="tb-preview" style={{ height: 260 }}>
            <div className="bg" style={{ background: hero === "gradient" ? t.grad : `repeating-linear-gradient(135deg, ${t.primary} 0 12px, ${t.accent} 12px 24px)` }} />
            <div className="tex" /><div className="scrim" />
            <div className="inner">
              <span style={{ display: "inline-block", background: t.accent, color: "#1a1206", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{type}</span>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 27, color: "#fff", marginTop: 8, lineHeight: 1 }}>{previewTitle}</div>
              <div style={{ marginTop: 12 }}><span style={{ display: "inline-block", background: t.primary, color: "#fff", fontWeight: 800, fontSize: 12, padding: "8px 14px", borderRadius: 9 }}>Get tickets</span></div>
            </div>
          </div>
          <div className="card" style={{ padding: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: t.primary, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Fans see <b>“{t.name}”</b>. Checkout stays neutral.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgAttendees() {
  const evs = orgEvents(ORG_ID);
  const ev = evs[0];
  const s = ev._s;
  const rows = ["Maria Santos", "Liza Cruz", "Marco Reyes", "Anna Lim", "Joce Tan", "Paolo Diaz", "Kim Reyes", "Ben Uy"];
  return (
    <div className="content-wide">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span style={{ width: 46, height: 46, borderRadius: 10, position: "relative", overflow: "hidden", border: "1.5px solid var(--line)" }}>
          <span style={{ position: "absolute", inset: 0, background: grad(ev) }} />
        </span>
        <div style={{ flex: 1 }}><h2 style={{ fontSize: 20 }}>{ev.title}</h2><div className="muted" style={{ fontSize: 13 }}>{ev.shortDate} · {ev.venue}</div></div>
        <select className="sel">{evs.map((e) => <option key={e.id}>{e.title}</option>)}</select>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat icon="ticket" color="#EA5A3D" n={s.sold} label="Tickets sold" />
        <Stat icon="check" color="#0E8A6E" n={s.scanned} label="Checked in" />
        <Stat icon="wallet" color="#118AB2" n={peso(s.revenue)} label="Revenue" />
        <Stat icon="user" color="#7C5CFF" n={s.cap - s.sold} label="Remaining" />
      </div>
      <Panel title="Attendees" link="Export CSV" style={{ marginTop: 16 }} pad={false}>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Tier</th><th>Order</th><th>Check-in</th></tr></thead>
          <tbody>
            {rows.map((n, i) => (
              <tr key={i}>
                <td><div className="ev-cell"><span className="av-mini" style={{ background: `oklch(0.7 0.16 ${i * 44})` }} /><div><div className="nm">{n}</div><div className="sub mono">{n.toLowerCase().replace(" ", ".")}@email.ph</div></div></div></td>
                <td>{["VIP", "General Admission", "Early Bird"][i % 3]}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>TIX-26-{1000 + i}</td>
                <td>{i < 3 ? <Badge kind="green">Checked in</Badge> : <Badge kind="gray">Not yet</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function OrgPromos() {
  const codes: [string, string, number, number, number][] = [
    ["BLOOM20", "percentage", 20, 140, 500],
    ["EARLYPH", "fixed", 200, 88, 200],
    ["VIPNIGHT", "percentage", 15, 12, 50],
  ];
  return (
    <div className="content-wide">
      <div className="toolbar"><div style={{ flex: 1 }} /><button className="btn btn-p"><Icon name="plus" size={16} /> New promo code</button></div>
      <Panel pad={false}>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Status</th></tr></thead>
          <tbody>
            {codes.map(([c, type, val, used, max], i) => (
              <tr key={i}>
                <td><span className="mono" style={{ fontWeight: 700, fontSize: 14, background: "var(--paper-2)", padding: "4px 9px", borderRadius: 7 }}>{c}</span></td>
                <td style={{ fontWeight: 700 }}>{type === "percentage" ? val + "% off" : peso(val) + " off"}</td>
                <td className="mono">{used}/{max}</td>
                <td>{used >= max ? <Badge kind="gray">Maxed</Badge> : <Badge kind="green">Active</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export function OrgPayouts() {
  // Live payout ledger (platform-collect model). Amounts are in centavos;
  // peso() expects whole pesos, so divide by 100.
  const rows = useQuery(api.payouts.listMyPayouts);

  if (rows === undefined) {
    return (
      <div className="content-wide">
        <Panel><div className="muted" style={{ padding: 8 }}>Loading payouts…</div></Panel>
      </div>
    );
  }

  const pendingNet = rows
    .filter((r) => r.status !== "settled")
    .reduce((s, r) => s + r.netAmount, 0);
  const settledNet = rows
    .filter((r) => r.status === "settled")
    .reduce((s, r) => s + r.netAmount, 0);
  const totalFee = rows.reduce((s, r) => s + r.feeAmount, 0);

  return (
    <div className="content-wide">
      <Panel style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, background: "#118AB2", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}><Icon name="wallet" size={24} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>PayMongo · Platform-collect</div>
            <div className="muted" style={{ fontSize: 13 }}>Funds are collected centrally and settled to you out-of-band. GCash · Maya · GrabPay · Cards.</div>
          </div>
          <Badge kind="green"><Icon name="check" size={12} /> Active</Badge>
        </div>
      </Panel>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Stat icon="clock" color="#FFC53D" n={peso(pendingNet / 100)} label="Pending payout" />
        <Stat icon="wallet" color="#0E8A6E" n={peso(settledNet / 100)} label="Settled to you" />
        <Stat icon="transfer" color="#118AB2" n={peso(totalFee / 100)} label="Platform fee (5%)" />
      </div>
      <Panel title="Payout ledger" style={{ marginTop: 16 }} pad={false}>
        {rows.length === 0 ? (
          <div className="muted" style={{ padding: 24 }}>
            No payouts yet — rows appear here automatically as tickets are sold.
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Date</th><th>Event</th><th>Method</th><th>Gross</th><th>Fee</th><th>Net</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="mono">{new Date(r.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td style={{ fontWeight: 600 }}>{r.eventTitle}</td>
                  <td className="muted" style={{ textTransform: "capitalize" }}>{r.provider}</td>
                  <td className="mono">{peso(r.grossAmount / 100)}</td>
                  <td className="mono muted">−{peso(r.feeAmount / 100)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{peso(r.netAmount / 100)}</td>
                  <td><Badge kind={r.status === "settled" ? "green" : "amber"}>{r.status === "settled" ? "Settled" : "Pending"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function OrgTeam() {
  const team: [string, string, string][] = [
    ["Maria Santos", "Owner", "#7C5CFF"],
    ["Paolo Diaz", "Manager", "#0E8A6E"],
    ["Kim Reyes", "Gate staff", "#118AB2"],
    ["Ben Uy", "Gate staff", "#118AB2"],
  ];
  return (
    <div className="content-wide">
      <div className="toolbar"><div style={{ flex: 1 }} /><button className="btn btn-p"><Icon name="plus" size={16} /> Invite member</button></div>
      <Panel pad={false}>
        <table className="tbl">
          <thead><tr><th>Member</th><th>Role</th><th>Events</th><th /></tr></thead>
          <tbody>
            {team.map(([n, r, c], i) => (
              <tr key={i}>
                <td><div className="ev-cell"><span className="av-mini" style={{ background: `oklch(0.7 0.15 ${i * 60})` }} /><div><div className="nm">{n}</div><div className="sub mono">{n.toLowerCase().replace(" ", ".")}@backspace.ph</div></div></div></td>
                <td><span className="role-chip" style={{ color: c }}>{r}</span></td>
                <td className="muted">{r === "Gate staff" ? "Aurora Fest" : "All events"}</td>
                <td style={{ textAlign: "right" }}><button className="btn btn-g btn-sm"><Icon name="sliders" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "12px 14px", background: "var(--paper-2)", borderRadius: 12, fontSize: 12.5, color: "var(--ink-3)" }}>
        <Icon name="info" size={15} /> Gate staff get a scanner-only login tied to assigned events. <span className="mono">staffAssignments</span>
      </div>
    </div>
  );
}

export function OrgPages({ page, go }: { page: string; go: (p: string) => void }) {
  if (page === "calendar") return <OrgCalendar />;
  if (page === "events") return <OrgEvents go={go} />;
  if (page === "create") return <CreateEvent go={go} />;
  if (page === "venues") return <VenueEditor mode="venue" />;
  if (page === "roster") return <RosterManager />;
  if (page === "programs") return <CreatorPrograms />;
  if (page === "attendees") return <OrgAttendees />;
  if (page === "promos") return <OrgPromos />;
  if (page === "payouts") return <OrgPayouts />;
  if (page === "team") return <OrgTeam />;
  return <OrgOverview go={go} />;
}

export type { BoEventWithStats };
