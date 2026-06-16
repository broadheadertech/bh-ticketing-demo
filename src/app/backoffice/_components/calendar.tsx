"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { EVENT_THEMES, themeForEvent } from "@/lib/themes";
import { kitFor } from "@/lib/event-kits";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Icon, Panel, Badge, StatusBadge, Drawer, Empty } from "./widgets";

type CalEvent = { id: string; title: string; date: number; color: string; status: string; dim?: boolean };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const colorFor = (theme?: string | null, eventType?: string | null) =>
  themeForEvent({ theme: theme ?? undefined, eventType: eventType ?? undefined }).primary;

/* ---------------- reusable calendar ---------------- */
function Calendar({ events, onOpen }: { events: CalEvent[]; onOpen: (id: string) => void }) {
  const [view, setView] = useState<"month" | "list">("month");
  const init = useMemo(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; }, []);
  const [cur, setCur] = useState(init);
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = dayKey(new Date(e.date));
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const monthLabel = new Date(cur.y, cur.m, 1).toLocaleString("en-PH", { month: "long", year: "numeric" });
  const firstWeekday = new Date(cur.y, cur.m, 1).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const step = (dir: number) => {
    let m = cur.m + dir;
    let y = cur.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCur({ y, m });
  };

  const listed = useMemo(() => [...events].sort((a, b) => a.date - b.date), [events]);

  return (
    <div>
      <div className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => step(-1)}><Icon name="left" size={16} /></button>
          <span className="cal-month">{monthLabel}</span>
          <button className="icon-btn" onClick={() => step(1)}><Icon name="right" size={16} /></button>
        </div>
        <button className="btn btn-g btn-sm" onClick={() => setCur(init)}>Today</button>
        <div style={{ flex: 1 }} />
        <div className="segtabs">
          <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>Month</button>
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
        </div>
      </div>

      {view === "month" ? (
        <div className="cal-grid">
          {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div className="cal-cell muted-cell" key={i} />;
            const cellDate = new Date(cur.y, cur.m, d);
            const isToday = today.getFullYear() === cur.y && today.getMonth() === cur.m && today.getDate() === d;
            const dayEvents = byDay.get(dayKey(cellDate)) ?? [];
            return (
              <div className={"cal-cell" + (isToday ? " today" : "")} key={i}>
                <div className="cal-daynum">{d}</div>
                {dayEvents.slice(0, 3).map((e) => (
                  <div key={e.id} className={"cal-chip" + (e.dim ? " dim" : "")} style={{ background: e.color }} onClick={() => onOpen(e.id)} title={e.title}>
                    <span className="t">{e.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="cal-more">+{dayEvents.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <Panel pad={false}>
          {listed.length === 0 ? (
            <Empty icon="info" title="No events to show" sub="Nothing matches this view yet." />
          ) : (
            listed.map((e) => {
              const d = new Date(e.date);
              return (
                <div className="cal-list-row" key={e.id} onClick={() => onOpen(e.id)}>
                  <div className="cal-date-pill">
                    <div className="d">{d.getDate()}</div>
                    <div className="mo">{d.toLocaleString("en-PH", { month: "short" })}</div>
                  </div>
                  <span className="cal-swatch" style={{ background: e.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{formatDate(e.date)}</div>
                  </div>
                  <StatusBadge s={e.status} />
                </div>
              );
            })
          )}
        </Panel>
      )}
    </div>
  );
}

/* ---------------- scope-aware event drawer (all roles) ---------------- */
function EventProfileDrawer({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev = useQuery(api.events.getCalendarEventDetail, { eventId: eventId as any });
  const theme = ev ? EVENT_THEMES[(ev.theme as keyof typeof EVENT_THEMES) ?? ""] ?? themeForEvent({ eventType: ev.eventType }) : null;

  return (
    <Drawer title="Event profile" onClose={onClose}>
      {ev === undefined ? (
        <div className="muted" style={{ padding: 20 }}>Loading…</div>
      ) : ev === null ? (
        <Empty icon="info" title="Not available" sub="This event isn't visible to your account." />
      ) : (
        <>
          <div className="tb-preview" style={{ height: 150 }}>
            <div className="bg" style={{ background: theme?.grad }} /><div className="tex" /><div className="scrim" />
            <div className="inner" style={{ left: 18, right: 18, bottom: 14 }}>
              <Badge kind="amber">{ev.eventType}</Badge>
              <h2 style={{ color: "#fff", fontSize: 22, marginTop: 8 }}>{ev.title}</h2>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, margin: "14px 0", flexWrap: "wrap" }}>
            <StatusBadge s={ev.status} />
            {theme && <Badge kind="gray">{theme.name} theme</Badge>}
          </div>

          {([["Date", `${formatDate(ev.date)} · ${ev.time}`], ["Venue", ev.venueName || "—"], ["Hosted by", ev.creatorName]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span className="muted" style={{ fontSize: 13 }}>{k}</span><span style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
            </div>
          ))}

          <h3 style={{ fontSize: 15, marginTop: 18 }}>Description</h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6, whiteSpace: "pre-wrap" }}>{ev.description}</p>

          {/* Capacity — max is public; tickets sold is owner/admin only */}
          <h3 style={{ fontSize: 15, marginTop: 18 }}>Capacity</h3>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span className="muted">Max capacity</span>
              <span className="mono" style={{ fontWeight: 700 }}>{(ev.maxAttendees ?? 0).toLocaleString()}</span>
            </div>
            {ev.currentAttendees != null && ev.maxAttendees != null ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span className="muted">{ev.currentAttendees.toLocaleString()} attending</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{Math.round((ev.currentAttendees / Math.max(1, ev.maxAttendees)) * 100)}%</span>
                </div>
                <div className="prog"><div className="v" style={{ width: Math.min(100, Math.round((ev.currentAttendees / Math.max(1, ev.maxAttendees)) * 100)) + "%" }} /></div>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Tickets sold is private to the organizer.</p>
            )}
          </div>

          {/* Participants — from event lineup, labeled per event type */}
          <h3 style={{ fontSize: 15, marginTop: 18 }}>{kitFor(ev.eventType).participantsLabel}</h3>
          {ev.artistsInvolved.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {ev.artistsInvolved.map((a) => (
                <span key={a} className="role-chip" style={{ fontSize: 12, padding: "5px 10px" }}>{a}</span>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>No lineup set for this event yet.</p>
          )}

          {/* Venue mapping — gap */}
          <h3 style={{ fontSize: 15, marginTop: 18 }}>Venue mapping</h3>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{ev.hasVenueMap ? "Seat map attached." : "No venue map attached yet. Build one in Venue maps / templates."}</p>

          {/* Tickets available — everyone */}
          <h3 style={{ fontSize: 15, marginTop: 18 }}>Tickets available</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {ev.tiers.length === 0 ? (
              <p className="muted" style={{ fontSize: 12.5 }}>No ticket tiers published.</p>
            ) : (
              ev.tiers.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 11 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.name}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{t.available} of {t.quantity} left</div>
                  </div>
                  <span className="mono" style={{ fontWeight: 700 }}>{formatCurrency(t.price)}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

/* ---------------- Admin: all events ---------------- */
export function AdminCalendar() {
  const events = useQuery(api.events.getEventsForAdminCalendar);
  const [sel, setSel] = useState<string | null>(null);
  const cal: CalEvent[] = (events ?? []).map((e) => ({
    id: e._id as string,
    title: e.title,
    date: e.date,
    status: e.status,
    color: colorFor(e.theme, e.eventType),
  }));
  return (
    <div className="content-wide">
      {events === undefined ? (
        <div className="muted" style={{ padding: 28 }}>Loading calendar…</div>
      ) : (
        <Calendar events={cal} onOpen={setSel} />
      )}
      {sel && <EventProfileDrawer eventId={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

/* ---------------- Organizer / Artist: own events + optional others ---------------- */
export function OrgCalendar() {
  const mine = useQuery(api.events.getMyEventsWithStats);
  const [showOthers, setShowOthers] = useState(false);
  const others = useQuery(api.events.listPublicEvents, showOthers ? {} : "skip");
  const [sel, setSel] = useState<string | null>(null);

  const ownIds = new Set((mine?.events ?? []).map((e) => e._id as string));
  const ownCal: CalEvent[] = (mine?.events ?? []).map((e) => ({
    id: e._id as string,
    title: e.title,
    date: e.date,
    status: e.status,
    color: colorFor(e.theme, e.eventType),
  }));
  const otherCal: CalEvent[] = showOthers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (others ?? []).filter((e: any) => !ownIds.has(e._id as string)).map((e: any) => ({
        id: e._id as string,
        title: e.title,
        date: e.date,
        status: e.status,
        color: colorFor(e.theme, e.eventType),
        dim: true,
      }))
    : [];

  return (
    <div className="content-wide">
      <div className="toolbar">
        <span className="muted" style={{ fontSize: 13 }}>Your events on the calendar. Toggle to peek at other upcoming events (limited info).</span>
        <div style={{ flex: 1 }} />
        <button className={"btn btn-sm " + (showOthers ? "btn-ink" : "btn-g")} onClick={() => setShowOthers((s) => !s)}>
          <Icon name="grid" size={14} /> {showOthers ? "Hiding others" : "Show other events"}
        </button>
      </div>
      {mine === undefined ? (
        <div className="muted" style={{ padding: 28 }}>Loading your calendar…</div>
      ) : (
        <Calendar events={[...ownCal, ...otherCal]} onOpen={setSel} />
      )}
      {sel && <EventProfileDrawer eventId={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

/* ---------------- Customer: my tickets / attended / upcoming ---------------- */
export function CustomerCalendar() {
  const [tab, setTab] = useState<"mine" | "attended" | "upcoming">("mine");
  const tickets = useQuery(api.tickets.getMyTickets);
  const upcoming = useQuery(api.events.listPublicEvents, tab === "upcoming" ? {} : "skip");
  const [sel, setSel] = useState<string | null>(null);

  const ticketEvents = useMemo(() => {
    const t = tickets ?? [];
    const seen = new Set<string>();
    const rows: CalEvent[] = [];
    for (const tk of t) {
      const attendedOnly = tab === "attended";
      if (attendedOnly && !tk.scannedAt) continue;
      const id = tk.eventId as string;
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        title: tk.eventTitle,
        date: tk.eventDate,
        status: tk.eventStatus,
        color: colorFor(tk.eventTheme, tk.eventType),
      });
    }
    return rows;
  }, [tickets, tab]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingEvents: CalEvent[] = (upcoming ?? []).map((e: any) => ({
    id: e._id as string,
    title: e.title,
    date: e.date,
    status: e.status,
    color: colorFor(e.theme, e.eventType),
  }));

  const events = tab === "upcoming" ? upcomingEvents : ticketEvents;
  const loading = tab === "upcoming" ? upcoming === undefined : tickets === undefined;

  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">
          {([["mine", "My events"], ["attended", "Attended"], ["upcoming", "All upcoming"]] as [typeof tab, string][]).map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 12.5 }}>
          {tab === "mine" ? "Events you hold tickets to." : tab === "attended" ? "Events you've checked into." : "Everything coming up on TIX.PH."}
        </span>
      </div>
      {loading ? (
        <div className="muted" style={{ padding: 28 }}>Loading…</div>
      ) : events.length === 0 ? (
        <Empty icon="ticket" title={tab === "attended" ? "No attended events yet" : tab === "mine" ? "No tickets yet" : "Nothing upcoming"} sub={tab === "upcoming" ? "Check back soon." : "Your tickets will appear here once you buy or register."} />
      ) : (
        <Calendar events={events} onOpen={setSel} />
      )}
      {sel && <EventProfileDrawer eventId={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
