"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Icon, Panel, Badge, Drawer, Empty } from "./widgets";

type Campaign = {
  _id: string;
  kind: string;
  title: string;
  description: string;
  goalAmount?: number;
  raisedAmount: number;
  supporterCount: number;
  targetCity?: string;
  status: string;
  deadline?: number;
  createdAt: number;
  creatorName: string;
  targetArtistName: string | null;
};

const KIND_META: Record<string, { label: string; ic: string; color: string }> = {
  sponsorship: { label: "Sponsorship", ic: "spark", color: "#7C5CFF" },
  fundraiser: { label: "Fundraiser", ic: "wallet", color: "#0E8A6E" },
  concert_request: { label: "Concert request", ic: "music", color: "#EA5A3D" },
};
const STATUS_KIND: Record<string, string> = {
  pending: "amber",
  active: "green",
  funded: "blue",
  rejected: "red",
  closed: "gray",
};

function ProgressLine({ c }: { c: Campaign }) {
  if (c.kind === "concert_request") {
    return <span className="mono muted" style={{ fontSize: 12 }}>{c.supporterCount} interested</span>;
  }
  const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
  return (
    <div style={{ minWidth: 150 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
        <span className="mono">{formatCurrency(c.raisedAmount)}</span>
        <span className="muted">{c.goalAmount ? `${pct}%` : ""}</span>
      </div>
      <div className="prog"><div className="v" style={{ width: pct + "%" }} /></div>
    </div>
  );
}

/* ---------------- Admin: moderate everything ---------------- */
export function AdminPrograms() {
  const all = useQuery(api.campaigns.listForAdmin) as Campaign[] | undefined;
  const setStatus = useMutation(api.campaigns.setStatus);
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState<Campaign | null>(null);

  const list = (all ?? []).filter((c) => tab === "all" || c.status === tab);
  const act = async (status: string) => {
    if (!sel) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await setStatus({ campaignId: sel._id as any, status });
    setSel(null);
  };

  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">
          {[["all", "All"], ["pending", "Pending"], ["active", "Active"], ["funded", "Funded"], ["closed", "Closed"]].map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span className="muted mono" style={{ fontSize: 12 }}>{list.length} programs</span>
      </div>
      <Panel pad={false}>
        <table className="tbl">
          <thead><tr><th>Program</th><th>Type</th><th>By</th><th>Progress</th><th>Status</th><th /></tr></thead>
          <tbody>
            {all === undefined ? (
              <tr><td colSpan={6} className="muted" style={{ padding: 28, textAlign: "center" }}>Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="muted" style={{ padding: 28, textAlign: "center" }}>No programs in this filter.</td></tr>
            ) : (
              list.map((c) => (
                <tr key={c._id} className="row-click" onClick={() => setSel(c)}>
                  <td style={{ fontWeight: 700 }}>{c.title}</td>
                  <td><Badge kind="gray">{KIND_META[c.kind]?.label ?? c.kind}</Badge></td>
                  <td>{c.creatorName}</td>
                  <td><ProgressLine c={c} /></td>
                  <td><Badge kind={STATUS_KIND[c.status] ?? "gray"}>{c.status}</Badge></td>
                  <td style={{ textAlign: "right" }}><Icon name="chevR" size={16} style={{ color: "var(--ink-3)" }} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Drawer title="Review program" onClose={() => setSel(null)} foot={<>
          {sel.status !== "active" && <button className="btn btn-ok" style={{ flex: 1 }} onClick={() => act("active")}><Icon name="check" size={16} /> Approve</button>}
          {sel.status === "pending" && <button className="btn btn-danger" onClick={() => act("rejected")}>Reject</button>}
          {sel.status === "active" && <button className="btn btn-danger" onClick={() => act("closed")}>Close</button>}
        </>}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Badge kind="gray">{KIND_META[sel.kind]?.label}</Badge>
            <Badge kind={STATUS_KIND[sel.status] ?? "gray"}>{sel.status}</Badge>
          </div>
          <h2 style={{ fontSize: 22 }}>{sel.title}</h2>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, whiteSpace: "pre-wrap" }}>{sel.description}</p>
          {([["Opened by", sel.creatorName], ["Target artist", sel.targetArtistName ?? "—"], ["City", sel.targetCity ?? "—"], ["Goal", sel.goalAmount ? formatCurrency(sel.goalAmount) : "—"], ["Raised", formatCurrency(sel.raisedAmount)], ["Backers", String(sel.supporterCount)], ["Deadline", sel.deadline ? formatDate(sel.deadline) : "—"]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line-2)" }}>
              <span className="muted" style={{ fontSize: 13 }}>{k}</span><span style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
            </div>
          ))}
        </Drawer>
      )}
    </div>
  );
}

/* ---------------- Organizer / Artist: create + manage ---------------- */
function CreateDrawer({ kind, onClose }: { kind: string; onClose: () => void }) {
  const create = useMutation(api.campaigns.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = KIND_META[kind];

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await create({
        kind,
        title: title.trim(),
        description: description.trim(),
        goalAmount: goal ? Math.round(Number(goal) * 100) : undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer title={`New ${meta.label.toLowerCase()}`} onClose={onClose} foot={
      <button className="btn btn-p" style={{ flex: 1 }} disabled={busy} onClick={submit}><Icon name="check" size={16} /> Submit for review</button>
    }>
      <div className="fld"><label>Title</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "fundraiser" ? "e.g. Tour van fund" : "e.g. Stage sponsor — Aurora Fest"} /></div>
      <div className="fld"><label>Description</label><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this for?" /></div>
      {kind !== "concert_request" && (
        <div className="fld"><label>Goal (₱)</label><input className="inp" type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="50000" /></div>
      )}
      <div style={{ display: "flex", gap: 8, padding: "11px 13px", background: "var(--paper-2)", borderRadius: 11, fontSize: 12, color: "var(--ink-3)" }}>
        <Icon name="info" size={14} /> Submitted programs go to admin for approval before they accept support.
      </div>
    </Drawer>
  );
}

export function CreatorPrograms({ isArtist = false }: { isArtist?: boolean }) {
  const mine = useQuery(api.campaigns.listMine) as Campaign[] | undefined;
  const requests = useQuery(api.campaigns.listForArtist) as Campaign[] | undefined;
  const [tab, setTab] = useState<string>("sponsorship");
  const [creating, setCreating] = useState<string | null>(null);

  const tabs: [string, string][] = isArtist
    ? [["sponsorship", "Sponsorships"], ["fundraiser", "Fundraisers"], ["requests", "Requests for me"]]
    : [["sponsorship", "Sponsorships"], ["fundraiser", "Fundraisers"]];

  const isRequests = tab === "requests";
  const list = isRequests ? requests ?? [] : (mine ?? []).filter((c) => c.kind === tab);

  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="segtabs">
          {tabs.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <div style={{ flex: 1 }} />
        {!isRequests && (
          <button className="btn btn-p" onClick={() => setCreating(tab)}><Icon name="plus" size={16} /> New {KIND_META[tab].label.toLowerCase()}</button>
        )}
      </div>

      {isRequests ? (
        (requests === undefined) ? (
          <div className="muted" style={{ padding: 28 }}>Loading…</div>
        ) : list.length === 0 ? (
          <Empty icon="music" title="No concert requests yet" sub="Fans and organizers can request you to perform — demand shows up here." />
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {list.map((c) => (
              <Panel key={c._id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div><h3 style={{ fontSize: 16 }}>{c.title}</h3><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{c.targetCity ?? "Anywhere"} · by {c.creatorName}</div></div>
                  <Badge kind={STATUS_KIND[c.status] ?? "gray"}>{c.status}</Badge>
                </div>
                <p className="muted" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{c.description}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{c.supporterCount}</span>
                  <span className="muted" style={{ fontSize: 12.5 }}>fans interested</span>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-g btn-sm" title="Turning demand into a real event is coming next">Plan a show</button>
                </div>
              </Panel>
            ))}
          </div>
        )
      ) : mine === undefined ? (
        <div className="muted" style={{ padding: 28 }}>Loading…</div>
      ) : list.length === 0 ? (
        <Empty icon={KIND_META[tab].ic} title={`No ${KIND_META[tab].label.toLowerCase()}s yet`} sub="Create one — it goes to admin for approval, then starts accepting support." cta={`New ${KIND_META[tab].label.toLowerCase()}`} onCta={() => setCreating(tab)} />
      ) : (
        <Panel pad={false}>
          <table className="tbl">
            <thead><tr><th>Program</th><th>Progress</th><th>Backers</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td><div style={{ fontWeight: 700 }}>{c.title}</div><div className="muted" style={{ fontSize: 12 }}>{formatDate(c.createdAt)}</div></td>
                  <td><ProgressLine c={c} /></td>
                  <td className="mono">{c.supporterCount}</td>
                  <td><Badge kind={STATUS_KIND[c.status] ?? "gray"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {creating && <CreateDrawer kind={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}
