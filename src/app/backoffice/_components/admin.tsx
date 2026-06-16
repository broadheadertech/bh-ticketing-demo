"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { EVENT_THEMES, themeForEvent } from "@/lib/themes";
import { Icon, Stat, Panel, Donut, Badge, StatusBadge, EvCell, Drawer, fmtK } from "./widgets";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { AdminCalendar } from "./calendar";
import { AdminPrograms } from "./programs";

const evGrad = (theme?: string | null, eventType?: string) =>
  (theme && EVENT_THEMES[theme as keyof typeof EVENT_THEMES]?.grad) ||
  themeForEvent({ eventType }).grad;

const CREATOR_ROLES = ["organization", "artist", "admin", "venue_manager", "staff"];
const ROLE_COLOR: Record<string, string> = {
  attendee: "#118AB2",
  artist: "#EA5A3D",
  organization: "#0E8A6E",
  admin: "#7C5CFF",
  venue_manager: "#9A6CFF",
  staff: "#8A8073",
};

function AdminOverview({ go }: { go: (p: string) => void }) {
  const m = useQuery(api.admin.getAdminDashboardMetrics);
  const mod = useQuery(api.admin.listEventsForModeration);
  const users = useQuery(api.admin.listUsers) as DirUser[] | undefined;

  if (m === undefined) return <div className="muted" style={{ padding: 28 }}>Loading overview…</div>;

  const needsMod = (mod ?? [])
    .filter((e) => e.status === "draft" || e.moderationStatus === "pending")
    .slice(0, 5);
  const recent = [...(users ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat icon="user" color="#118AB2" n={fmtK(m.totalUsers)} label="Total users" />
        <Stat icon="ticket" color="#EA5A3D" n={fmtK(m.totalTicketsSold)} label="Tickets sold" />
        <Stat icon="wallet" color="#0E8A6E" n={formatCurrency(m.totalRevenue)} label="Gross volume" />
        <Stat icon="spark" color="#7C5CFF" n={m.activeCreators} label="Active creators" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 16 }}>
        <Panel title="Needs moderation" link="Open queue" onLink={() => go("moderation")} pad={false}>
          <table className="tbl">
            <tbody>
              {needsMod.length === 0 ? (
                <tr><td className="muted" style={{ padding: 22 }}>Nothing awaiting review.</td></tr>
              ) : (
                needsMod.map((e) => (
                  <tr key={e._id} className="row-click" onClick={() => go("moderation")}>
                    <td><EvCell title={e.title} grad={evGrad(e.theme, e.eventType)} sub={e.creatorName} /></td>
                    <td style={{ textAlign: "right" }}><StatusBadge s={e.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
        <Panel title="Events by status">
          <Donut centerN={m.totalEvents} centerL="events" segments={[
            { l: "Published", v: m.eventsByStatus.published, c: "#0E8A6E" },
            { l: "Draft", v: m.eventsByStatus.draft, c: "#8A8073" },
            { l: "Cancelled", v: m.eventsByStatus.cancelled, c: "#DC2626" },
          ]} />
        </Panel>
      </div>
      <Panel title="Recent signups" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {recent.length === 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>No users yet.</span>
          ) : (
            recent.map((u, i) => (
              <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span className="av-mini" style={{ background: `oklch(0.7 0.16 ${i * 70})` }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.name}</div><div className="muted mono" style={{ fontSize: 11.5 }}>{u.email}</div></div>
                <span className="role-chip" style={{ color: ROLE_COLOR[u.activeRole] }}>{u.activeRole}</span>
                <span className="muted" style={{ fontSize: 11.5 }}>{formatDate(u.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}

type ModRow = {
  _id: string;
  title: string;
  description: string;
  eventType: string;
  theme: string | null;
  date: number;
  venueName?: string;
  status: string;
  moderationStatus?: string;
  createdAt: number;
  creatorName: string;
  creatorEmail: string;
};

function AdminModeration() {
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState<ModRow | null>(null);
  const [reason, setReason] = useState("");
  const events = useQuery(api.admin.listEventsForModeration) as ModRow[] | undefined;
  const approve = useMutation(api.admin.adminApproveEvent);
  const unpublish = useMutation(api.admin.adminUnpublishEvent);

  const list = (events ?? []).filter((e) => tab === "all" || e.status === tab);

  const doApprove = async () => {
    if (!sel) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await approve({ eventId: sel._id as any });
    setSel(null);
  };
  const doUnpublish = async () => {
    if (!sel) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await unpublish({ eventId: sel._id as any, reason: reason.trim() || "Unpublished by admin" });
    setSel(null);
    setReason("");
  };

  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">
          {[["all", "All"], ["draft", "Drafts"], ["published", "Published"], ["cancelled", "Cancelled"]].map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span className="muted mono" style={{ fontSize: 12 }}>{list.length} events</span>
      </div>
      <Panel pad={false}>
        <table className="tbl">
          <thead><tr><th>Event</th><th>Organizer</th><th>Date</th><th>Status</th><th /></tr></thead>
          <tbody>
            {events === undefined ? (
              <tr><td colSpan={5} className="muted" style={{ padding: 28, textAlign: "center" }}>Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ padding: 28, textAlign: "center" }}>No events in this filter.</td></tr>
            ) : (
              list.map((e) => (
                <tr key={e._id} className="row-click" onClick={() => { setSel(e); setReason(""); }}>
                  <td><EvCell title={e.title} grad={evGrad(e.theme, e.eventType)} sub={e.venueName ?? "—"} /></td>
                  <td>{e.creatorName}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{formatDate(e.date)}</td>
                  <td><StatusBadge s={e.status} /></td>
                  <td style={{ textAlign: "right" }}><Icon name="chevR" size={16} style={{ color: "var(--ink-3)" }} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Drawer title="Review event" onClose={() => setSel(null)} foot={<>
          <button className="btn btn-ok" style={{ flex: 1 }} onClick={doApprove}><Icon name="check" size={16} /> Approve &amp; publish</button>
          <button className="btn btn-danger" onClick={doUnpublish}>Unpublish</button>
        </>}>
          <div className="tb-preview" style={{ height: 180 }}>
            <div className="bg" style={{ background: evGrad(sel.theme, sel.eventType) }} /><div className="tex" /><div className="scrim" />
            <div className="inner" style={{ left: 18, right: 18, bottom: 16 }}>
              <Badge kind="amber">{sel.eventType}</Badge>
              <h2 style={{ color: "#fff", fontSize: 24, marginTop: 8 }}>{sel.title}</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
            <StatusBadge s={sel.status} />
            {sel.theme && <Badge kind="gray">{EVENT_THEMES[sel.theme as keyof typeof EVENT_THEMES]?.name ?? sel.theme} theme</Badge>}
          </div>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{sel.description}</p>
          {([["Organizer", sel.creatorName], ["Email", sel.creatorEmail], ["Venue", sel.venueName ?? "—"], ["Date", formatDate(sel.date)]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span className="muted" style={{ fontSize: 13 }}>{k}</span><span style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
            </div>
          ))}
          <div className="fld" style={{ marginTop: 16 }}><label>Reason (sent to organizer on unpublish)</label><textarea className="inp" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being unpublished?" /></div>
        </Drawer>
      )}
    </div>
  );
}

type DirUser = {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  activeRole: string;
  isActive: boolean;
  createdAt: number;
};

const USER_TABS: [string, string][] = [
  ["all", "All"],
  ["organization", "Organizers"],
  ["artist", "Artists"],
  ["customer", "Customers"],
];

function matchesTab(u: DirUser, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "customer") return !u.roles.some((r) => CREATOR_ROLES.includes(r));
  return u.roles.includes(tab);
}

function AdminUsers({ initialTab = "all" }: { initialTab?: string }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(initialTab);
  const users = useQuery(api.admin.listUsers) as DirUser[] | undefined;

  const counts = {
    all: users?.length ?? 0,
    organization: users?.filter((u) => u.roles.includes("organization")).length ?? 0,
    artist: users?.filter((u) => u.roles.includes("artist")).length ?? 0,
    customer: users?.filter((u) => !u.roles.some((r) => CREATOR_ROLES.includes(r))).length ?? 0,
  };

  const list = (users ?? []).filter((u) => {
    if (!matchesTab(u, tab)) return false;
    const ql = q.trim().toLowerCase();
    return !ql || u.name.toLowerCase().includes(ql) || u.email.toLowerCase().includes(ql);
  });

  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">
          {USER_TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {l}
              <span className="muted" style={{ marginLeft: 6, fontWeight: 700 }}>
                {counts[k as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
        <div className="search" style={{ flex: 1 }}>
          <Icon name="search" size={18} style={{ color: "var(--ink-3)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" />
        </div>
        <span className="muted mono" style={{ fontSize: 12 }}>{list.length} shown</span>
      </div>
      <Panel pad={false}>
        <table className="tbl">
          <thead><tr><th>User</th><th>Roles</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody>
            {users === undefined ? (
              <tr><td colSpan={4} className="muted" style={{ padding: 28, textAlign: "center" }}>Loading users…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={4} className="muted" style={{ padding: 28, textAlign: "center" }}>No users in this segment.</td></tr>
            ) : (
              list.map((u, i) => (
                <tr key={u._id}>
                  <td><div className="ev-cell"><span className="av-mini" style={{ background: `oklch(0.7 0.16 ${i * 50})` }} /><div><div className="nm">{u.name}</div><div className="sub mono">{u.email}</div></div></div></td>
                  <td><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{u.roles.map((r) => <span key={r} className="role-chip" style={{ color: ROLE_COLOR[r] }}>{r}</span>)}</div></td>
                  <td className="mono muted" style={{ fontSize: 12 }}>{formatDate(u.createdAt)}</td>
                  <td>{u.isActive ? <Badge kind="green">Active</Badge> : <Badge kind="red">Disabled</Badge>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

type BuyerRow = { email: string; orders: number; spent: number; eventsAttended: number; checkedIn: number; lastPurchase: number };
type OrganizerRow = { userId: string; name: string; email: string; eventsCount: number; liveCount: number; ticketsSold: number; gross: number };

function AdminPartners() {
  const buyers = useQuery(api.admin.getTopBuyers, { limit: 20 }) as BuyerRow[] | undefined;
  const organizers = useQuery(api.admin.getTopOrganizers, { limit: 20 }) as OrganizerRow[] | undefined;

  return (
    <div className="content-wide">
      <div style={{ display: "flex", gap: 8, marginBottom: 18, padding: "12px 14px", background: "var(--paper-2)", borderRadius: 12, fontSize: 12.5, color: "var(--ink-3)" }}>
        <Icon name="info" size={15} /> Frequent buyers are your promo audience; active organizers are partnership leads. Ranked from live ticket & event data.
      </div>

      <Panel title="Top customers — promo targets" link="Live" pad={false} style={{ marginBottom: 16 }}>
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Orders</th><th>Events</th><th>Checked in</th><th>Total spend</th><th>Last order</th></tr></thead>
          <tbody>
            {buyers === undefined ? (
              <tr><td colSpan={6} className="muted" style={{ padding: 28, textAlign: "center" }}>Loading…</td></tr>
            ) : buyers.length === 0 ? (
              <tr><td colSpan={6} className="muted" style={{ padding: 28, textAlign: "center" }}>No ticket sales yet — buyers will rank here once tickets are sold.</td></tr>
            ) : (
              buyers.map((b, i) => (
                <tr key={b.email}>
                  <td><div className="ev-cell"><span className="av-mini" style={{ background: `oklch(0.7 0.16 ${i * 47})` }} /><div><div className="nm">{b.email}</div><div className="sub mono">#{i + 1} customer</div></div></div></td>
                  <td className="mono">{b.orders}</td>
                  <td className="mono">{b.eventsAttended}</td>
                  <td className="mono">{b.checkedIn}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(b.spent)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>{b.lastPurchase ? formatDate(b.lastPurchase) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      <Panel title="Top organizers — partnership leads" link="Live" pad={false}>
        <table className="tbl">
          <thead><tr><th>Organizer</th><th>Events</th><th>Live</th><th>Tickets sold</th><th>Gross</th></tr></thead>
          <tbody>
            {organizers === undefined ? (
              <tr><td colSpan={5} className="muted" style={{ padding: 28, textAlign: "center" }}>Loading…</td></tr>
            ) : organizers.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ padding: 28, textAlign: "center" }}>No organizer events yet.</td></tr>
            ) : (
              organizers.map((o, i) => (
                <tr key={o.userId}>
                  <td><div className="ev-cell"><span className="av-mini" style={{ background: `oklch(0.7 0.15 ${i * 53})` }} /><div><div className="nm">{o.name}</div><div className="sub mono">{o.email}</div></div></div></td>
                  <td className="mono">{o.eventsCount}</td>
                  <td className="mono">{o.liveCount}</td>
                  <td className="mono">{o.ticketsSold.toLocaleString()}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(o.gross)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function AdminFinance() {
  const f = useQuery(api.admin.getFinancialMetrics, { dateRange: "all_time" });
  if (f === undefined) return <div className="muted" style={{ padding: 28 }}>Loading finance…</div>;
  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat icon="wallet" color="#0E8A6E" n={formatCurrency(f.gmv)} label="Gross volume (all-time)" />
        <Stat icon="spark" color="#EA5A3D" n={formatCurrency(f.platformFees)} label="Platform fees (5%)" />
        <Stat icon="transfer" color="#118AB2" n={formatCurrency(f.netRevenue)} label="Net revenue (after infra)" />
        <Stat icon="ticket" color="#7C5CFF" n={fmtK(f.totalTicketsSold)} label="Tickets sold" />
      </div>
      <Panel title="Revenue by event" style={{ marginTop: 16 }} pad={false}>
        <table className="tbl">
          <thead><tr><th>Event</th><th>Status</th><th>Tickets sold</th><th>Revenue</th></tr></thead>
          <tbody>
            {f.eventBreakdown.length === 0 ? (
              <tr><td colSpan={4} className="muted" style={{ padding: 28, textAlign: "center" }}>No revenue yet.</td></tr>
            ) : (
              f.eventBreakdown.map((e) => (
                <tr key={e.eventId as string}>
                  <td style={{ fontWeight: 700 }}>{e.title}</td>
                  <td><StatusBadge s={e.status} /></td>
                  <td className="mono">{e.ticketsSold.toLocaleString()}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(e.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

const AUDIT_KIND = (action: string): string =>
  action.includes("approved") ? "violet"
  : action.includes("unpublish") || action.includes("cancel") ? "amber"
  : action.includes("disable") || action.includes("delete") ? "red"
  : action.includes("role") ? "blue"
  : "gray";

function AdminAudit() {
  const logs = useQuery(api.admin.listAuditLogs, { limit: 100 });
  return (
    <div className="content-wide">
      <Panel title="Audit log" pad={false}>
        <table className="tbl">
          <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>When</th></tr></thead>
          <tbody>
            {logs === undefined ? (
              <tr><td colSpan={4} className="muted" style={{ padding: 28, textAlign: "center" }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="muted" style={{ padding: 28, textAlign: "center" }}>No admin actions logged yet.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l._id as string}>
                  <td><Badge kind={AUDIT_KIND(l.action)}><span className="mono" style={{ fontSize: 11 }}>{l.action}</span></Badge></td>
                  <td style={{ fontWeight: 700 }}>{l.actorName}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{l.targetType}:{String(l.targetId).slice(0, 8)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>{formatDate(l.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function AdminPayouts() {
  const rows = useQuery(api.payouts.listPayoutsForAdmin, {});
  const settle = useMutation(api.payouts.settlePayout);
  if (rows === undefined) return <div className="muted" style={{ padding: 28 }}>Loading payouts…</div>;

  const pending = rows.filter((r) => r.status !== "settled").reduce((s, r) => s + r.netAmount, 0);
  const settled = rows.filter((r) => r.status === "settled").reduce((s, r) => s + r.netAmount, 0);
  const fees = rows.reduce((s, r) => s + r.feeAmount, 0);

  return (
    <div className="content-wide">
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Stat icon="clock" color="#FFC53D" n={formatCurrency(pending)} label="Pending payouts (owed)" />
        <Stat icon="wallet" color="#0E8A6E" n={formatCurrency(settled)} label="Settled to organizers" />
        <Stat icon="spark" color="#EA5A3D" n={formatCurrency(fees)} label="Platform fees collected" />
      </div>
      <Panel title="Payout ledger" style={{ marginTop: 16 }} pad={false}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Event</th><th>Organizer</th><th>Method</th><th>Gross</th><th>Fee</th><th>Net owed</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="muted" style={{ padding: 28, textAlign: "center" }}>No payouts yet — rows appear as tickets are sold.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id as string}>
                  <td className="mono">{formatDate(r.createdAt)}</td>
                  <td style={{ fontWeight: 700 }}>{r.eventTitle}</td>
                  <td>{r.organizerName}<div className="muted mono" style={{ fontSize: 11 }}>{r.organizerEmail}</div></td>
                  <td className="muted" style={{ textTransform: "capitalize" }}>{r.provider}</td>
                  <td className="mono">{formatCurrency(r.grossAmount)}</td>
                  <td className="mono muted">−{formatCurrency(r.feeAmount)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(r.netAmount)}</td>
                  <td><Badge kind={r.status === "settled" ? "green" : "amber"}>{r.status === "settled" ? "Settled" : "Pending"}</Badge></td>
                  <td>
                    {r.status !== "settled" && (
                      <button
                        className="btn btn-g btn-sm"
                        onClick={async () => {
                          try {
                            await settle({ payoutId: r._id });
                            showSuccess("Marked as settled");
                          } catch (e) {
                            showErrorFromCatch(e);
                          }
                        }}
                      >
                        Mark settled
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export function AdminPages({ page, go }: { page: string; go: (p: string) => void }) {
  if (page === "calendar") return <AdminCalendar />;
  if (page === "moderation") return <AdminModeration />;
  if (page === "organizers") return <AdminUsers key="organizers" initialTab="organization" />;
  if (page === "artists") return <AdminUsers key="artists" initialTab="artist" />;
  if (page === "users") return <AdminUsers key="users" initialTab="all" />;
  if (page === "partners") return <AdminPartners />;
  if (page === "programs") return <AdminPrograms />;
  if (page === "finance") return <AdminFinance />;
  if (page === "payouts") return <AdminPayouts />;
  if (page === "audit") return <AdminAudit />;
  // "templates" is handled by the venue editor via the page router
  return <AdminOverview go={go} />;
}
