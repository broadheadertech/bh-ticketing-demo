"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Icon, Panel, Drawer, Empty } from "./widgets";

type Participant = {
  _id: string;
  name: string;
  role: string | null;
  bio: string | null;
  linkUrl: string | null;
};

function EditDrawer({
  initial,
  onClose,
}: {
  initial: Participant | null; // null = creating
  onClose: () => void;
}) {
  const create = useMutation(api.participants.create);
  const update = useMutation(api.participants.update);
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (initial) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await update({ id: initial._id as any, name: name.trim(), role, bio, linkUrl });
      } else {
        await create({ name: name.trim(), role, bio, linkUrl });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={initial ? "Edit roster entry" : "Add to roster"}
      onClose={onClose}
      foot={
        <button className="btn btn-p" style={{ flex: 1 }} disabled={busy} onClick={submit}>
          <Icon name="check" size={16} /> {initial ? "Save" : "Add"}
        </button>
      }
    >
      <div className="fld"><label>Name</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Ridges" /></div>
      <div className="fld"><label>Role</label><input className="inp" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Speaker / Headliner / Team / Driver…" /></div>
      <div className="fld"><label>Bio</label><textarea className="inp" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio shown on event pages…" /></div>
      <div className="fld"><label>Link</label><input className="inp" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… (site, socials)" /></div>
    </Drawer>
  );
}

export function RosterManager() {
  const roster = useQuery(api.participants.listMine) as Participant[] | undefined;
  const remove = useMutation(api.participants.remove);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Participant | null>(null);
  const [creating, setCreating] = useState(false);

  const list = (roster ?? []).filter(
    (p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.role ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const del = async (p: Participant) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await remove({ id: p._id as any });
  };

  return (
    <div className="content-wide">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} style={{ color: "var(--ink-3)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your roster…" />
        </div>
        <button className="btn btn-p" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> Add to roster
        </button>
      </div>

      {roster === undefined ? (
        <div className="muted" style={{ padding: 28 }}>Loading…</div>
      ) : list.length === 0 ? (
        <Empty
          icon="user"
          title={roster.length === 0 ? "Your roster is empty" : "No matches"}
          sub="Add speakers, artists, racers, teams or hosts here — then attach them to any event."
          cta={roster.length === 0 ? "Add to roster" : undefined}
          onCta={() => setCreating(true)}
        />
      ) : (
        <Panel pad={false}>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Bio</th><th /></tr></thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={p._id}>
                  <td>
                    <div className="ev-cell">
                      <span className="av-mini" style={{ background: `oklch(0.7 0.16 ${i * 47})` }} />
                      <div className="nm">{p.name}</div>
                    </div>
                  </td>
                  <td>{p.role ? <span className="role-chip">{p.role}</span> : <span className="muted">—</span>}</td>
                  <td className="muted" style={{ fontSize: 12.5, maxWidth: 360 }}>{p.bio ?? "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-g btn-sm" onClick={() => setEditing(p)}><Icon name="sliders" size={14} /> Edit</button>{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => del(p)}><Icon name="x" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {creating && <EditDrawer initial={null} onClose={() => setCreating(false)} />}
      {editing && <EditDrawer initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
