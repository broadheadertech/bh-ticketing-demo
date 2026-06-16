"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Icon, Panel } from "./widgets";

type LiveMap = { _id: string; name: string; kind: string; data: { stage: Stage; sections: Section[] }; capacity: number; updatedAt: number };

/* ---------------- model ---------------- */
type Stage = { x: number; y: number; w: number; h: number; rot: number; label: string };
type Section = {
  id: string;
  kind: "seated" | "ga";
  label: string;
  tier: string;
  x: number;
  y: number;
  rot?: number;
  // seated
  rows?: number;
  cols?: number;
  colPitch?: number;
  rowPitch?: number;
  curve?: number;
  // ga
  w?: number;
  h?: number;
  capacity?: number;
};
type VenueMap = { stage: Stage; sections: Section[] };
type Doc = { stage: Stage; sections: Section[]; bg: string | null };

const VE_TIERS = [
  { id: "vip", name: "VIP", c: "#E8C45A" },
  { id: "lower", name: "Lower", c: "#8FB0E6" },
  { id: "premium", name: "Premium", c: "#EFA0C0" },
  { id: "balcony", name: "Balcony", c: "#79C9A6" },
  { id: "ga", name: "GA / Standing", c: "#C8BCA6" },
];
const VE_TIER: Record<string, { id: string; name: string; c: string }> = Object.fromEntries(
  VE_TIERS.map((t) => [t.id, t])
);
const ROWL = (i: number) => String.fromCharCode(65 + (i % 26));
let _veId = 0;
const newId = (p: string) => p + "-" + ++_veId;
const VBW = 1000;
const VBH = 560;

function seatsOf(sec: Section): number {
  return sec.kind === "ga" ? +(sec.capacity || 0) : (sec.rows || 0) * (sec.cols || 0);
}
const cP = (s: Section) => +(s.colPitch || 16);
const rP = (s: Section) => +(s.rowPitch || 17);

function seatXY(sec: Section, r: number, c: number): { x: number; y: number } {
  const colP = cP(sec);
  const rowP = rP(sec);
  const cols = sec.cols || 1;
  const w = (cols - 1) * colP;
  if (sec.curve && cols > 1) {
    const arc = (sec.curve * Math.PI) / 180;
    const R = w / (2 * Math.sin(arc / 2));
    const a = -arc / 2 + (c / (cols - 1)) * arc;
    return { x: w / 2 + R * Math.sin(a), y: r * rowP + (R - R * Math.cos(a)) };
  }
  return { x: c * colP, y: r * rowP };
}
function secBox(sec: Section): { w: number; h: number } {
  const cols = sec.cols || 1;
  const rows = sec.rows || 1;
  const w = (cols - 1) * cP(sec) + 13;
  let h = (rows - 1) * rP(sec) + 13;
  if (sec.curve && cols > 1) {
    const last = seatXY(sec, rows - 1, 0);
    h = last.y + 13;
  }
  return { w, h };
}
const DEF_STAGE = (): Stage => ({ x: 395, y: 22, w: 210, h: 34, rot: 0, label: "STAGE" });

const STARTER_ARENA = (): Section[] => [
  { id: newId("s"), kind: "seated", label: "VIP A", tier: "vip", x: 372, y: 96, rows: 4, cols: 14, colPitch: 16, rowPitch: 17, rot: 0, curve: 0 },
  { id: newId("s"), kind: "seated", label: "Lower Center", tier: "lower", x: 322, y: 188, rows: 7, cols: 18, colPitch: 16, rowPitch: 17, rot: 0, curve: 28 },
  { id: newId("s"), kind: "seated", label: "Lower Left", tier: "lower", x: 150, y: 150, rows: 6, cols: 6, colPitch: 16, rowPitch: 17, rot: 18, curve: 0 },
  { id: newId("s"), kind: "seated", label: "Lower Right", tier: "lower", x: 690, y: 150, rows: 6, cols: 6, colPitch: 16, rowPitch: 17, rot: -18, curve: 0 },
  { id: newId("s"), kind: "ga", label: "GA Pit", tier: "ga", x: 372, y: 330, w: 256, h: 70, capacity: 1200 },
];

/* ---------------- canvas ---------------- */
type DragState =
  | { t: "sec"; id: string; sx: number; sy: number; ox: number; oy: number; s: number }
  | { t: "stage" | "stage-rz"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; s: number }
  | null;

function VenueCanvas({
  map,
  selId,
  onSelect,
  onMoveSec,
  onStage,
  bg,
  bgOpacity,
}: {
  map: VenueMap;
  selId: string | null;
  onSelect: (id: string | null) => void;
  onMoveSec: (id: string, x: number, y: number) => void;
  onStage: (o: Partial<Stage>) => void;
  bg: string | null;
  bgOpacity: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<DragState>(null);
  const cb = useRef({ onMoveSec, onStage });
  useEffect(() => {
    cb.current = { onMoveSec, onStage };
  });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = (e.clientX - d.sx) * d.s;
      const dy = (e.clientY - d.sy) * d.s;
      if (d.t === "sec") cb.current.onMoveSec(d.id, Math.round(d.ox + dx), Math.round(d.oy + dy));
      else if (d.t === "stage") cb.current.onStage({ x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) });
      else if (d.t === "stage-rz") cb.current.onStage({ w: Math.max(60, Math.round(d.ow + dx)), h: Math.max(20, Math.round(d.oh + dy)) });
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  const scaleNow = () => (ref.current ? VBW / ref.current.getBoundingClientRect().width : 1);
  const downSec = (e: React.PointerEvent, sec: Section) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(sec.id);
    drag.current = { t: "sec", id: sec.id, sx: e.clientX, sy: e.clientY, ox: sec.x, oy: sec.y, s: scaleNow() };
  };
  const downStage = (e: React.PointerEvent, t: "stage" | "stage-rz") => {
    e.stopPropagation();
    e.preventDefault();
    onSelect("stage");
    const st = map.stage;
    drag.current = { t, sx: e.clientX, sy: e.clientY, ox: st.x, oy: st.y, ow: st.w, oh: st.h, s: scaleNow() };
  };

  const st = map.stage;
  return (
    <svg ref={ref} className="ve-canvas" viewBox={`0 0 ${VBW} ${VBH}`} onPointerDown={() => onSelect(null)}>
      <defs>
        <pattern id="vegrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="rgba(23,18,12,.05)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={VBW} height={VBH} fill="url(#vegrid)" />
      {bg && <image href={bg} x="0" y="0" width={VBW} height={VBH} preserveAspectRatio="xMidYMid meet" opacity={bgOpacity} style={{ pointerEvents: "none" }} />}

      <g className="ve-sec-hit" transform={`rotate(${st.rot || 0} ${st.x + st.w / 2} ${st.y + st.h / 2})`}>
        <rect x={st.x} y={st.y} width={st.w} height={st.h} rx="7" fill="var(--ink)" onPointerDown={(e) => downStage(e, "stage")} style={{ cursor: "grab" }} stroke={selId === "stage" ? "var(--coral)" : "none"} strokeWidth="2.5" />
        <text x={st.x + st.w / 2} y={st.y + st.h / 2 + 5} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="14" letterSpacing="4" fill="#FBF6EC" style={{ pointerEvents: "none" }}>{st.label}</text>
        {selId === "stage" && <circle className="ve-handle" cx={st.x + st.w} cy={st.y + st.h} r="7" fill="var(--coral)" stroke="#fff" strokeWidth="2" onPointerDown={(e) => downStage(e, "stage-rz")} />}
      </g>

      {map.sections.map((sec) => {
        const sel = sec.id === selId;
        if (sec.kind === "ga") {
          const gw = sec.w || 0;
          const gh = sec.h || 0;
          const gcx = sec.x + gw / 2;
          const gcy = sec.y + gh / 2;
          return (
            <g key={sec.id} className={"ve-sec-hit" + (sel ? " sel" : "")} transform={`rotate(${sec.rot || 0} ${gcx} ${gcy})`} onPointerDown={(e) => downSec(e, sec)}>
              <rect x={sec.x} y={sec.y} width={gw} height={gh} rx="10" fill={VE_TIER.ga.c} fillOpacity="0.22" stroke={sel ? "var(--ink)" : VE_TIER.ga.c} strokeWidth={sel ? 2.5 : 2} strokeDasharray="7 5" />
              <text x={sec.x + gw / 2} y={sec.y + gh / 2 - 3} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" fill="var(--ink-2)" style={{ pointerEvents: "none" }}>{sec.label}</text>
              <text x={sec.x + gw / 2} y={sec.y + gh / 2 + 13} textAnchor="middle" fontFamily="var(--font-plaza-mono)" fontSize="10" fill="var(--ink-3)" style={{ pointerEvents: "none" }}>{(+(sec.capacity || 0)).toLocaleString()} standing</text>
            </g>
          );
        }
        const color = VE_TIER[sec.tier]?.c || "#ccc";
        const box = secBox(sec);
        const cx = sec.x + box.w / 2;
        const cy = sec.y + box.h / 2;
        return (
          <g key={sec.id} className={"ve-sec-hit" + (sel ? " sel" : "")} transform={`rotate(${sec.rot || 0} ${cx} ${cy})`} onPointerDown={(e) => downSec(e, sec)}>
            <rect x={sec.x - 8} y={sec.y - 20} width={box.w + 16} height={box.h + 26} rx="8" fill="rgba(0,0,0,0)" style={{ pointerEvents: "all" }} />
            {sel && <rect x={sec.x - 8} y={sec.y - 20} width={box.w + 16} height={box.h + 26} rx="8" fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 4" />}
            <text x={sec.x + box.w / 2} y={sec.y - 7} textAnchor="middle" className="sec-label">{sec.label}</text>
            {Array.from({ length: sec.rows || 0 }).map((_, r) =>
              Array.from({ length: sec.cols || 0 }).map((_, c) => {
                const p = seatXY(sec, r, c);
                return <rect key={r + "-" + c} x={sec.x + p.x} y={sec.y + p.y} width="12" height="12" rx="3" fill={color} stroke="rgba(23,18,12,.16)" strokeWidth="0.5" style={{ pointerEvents: "none" }} />;
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MiniMap({ map }: { map: { stage: Stage; sections: Section[] } }) {
  const st = map.stage || DEF_STAGE();
  return (
    <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect x={st.x} y={st.y} width={st.w} height={st.h} rx="7" fill="var(--ink)" transform={`rotate(${st.rot || 0} ${st.x + st.w / 2} ${st.y + st.h / 2})`} />
      {map.sections.map((sec) => {
        if (sec.kind === "ga") {
          const gw = sec.w || 0;
          const gh = sec.h || 0;
          return <rect key={sec.id} x={sec.x} y={sec.y} width={gw} height={gh} rx="10" fill={VE_TIER.ga.c} fillOpacity="0.3" stroke={VE_TIER.ga.c} strokeWidth="2" strokeDasharray="7 5" transform={`rotate(${sec.rot || 0} ${sec.x + gw / 2} ${sec.y + gh / 2})`} />;
        }
        const color = VE_TIER[sec.tier]?.c || "#ccc";
        const box = secBox(sec);
        const cx = sec.x + box.w / 2;
        const cy = sec.y + box.h / 2;
        return (
          <g key={sec.id} transform={`rotate(${sec.rot || 0} ${cx} ${cy})`}>
            {Array.from({ length: sec.rows || 0 }).map((_, r) =>
              Array.from({ length: sec.cols || 0 }).map((_, c) => {
                const p = seatXY(sec, r, c);
                return <rect key={r + "-" + c} x={sec.x + p.x} y={sec.y + p.y} width="12" height="12" rx="3" fill={color} />;
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- inspector inputs ---------------- */
function NumF({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="fld ve-mini">
      <label>{label}</label>
      <input className="inp" type="number" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value === "" ? 0 : +e.target.value)} />
    </div>
  );
}

function RotRow({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const snaps = [0, 90, 180, -90, -180];
  const v = value || 0;
  return (
    <div className="fld ve-mini" style={{ marginBottom: 0 }}>
      <label>Rotation: {v}°</label>
      <input className="ve-range" type="range" min="-180" max="180" value={v} onChange={(e) => onChange(+e.target.value)} />
      <div className="ve-snaps">
        {snaps.map((s) => (
          <button key={s} className={"ve-snap" + (v === s ? " on" : "")} onClick={() => onChange(s)}>
            {s > 0 ? "+" : ""}{s}°
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- editor ---------------- */
export function VenueEditor({ mode }: { mode: "venue" | "template" }) {
  const isTpl = mode === "template";
  const kind = isTpl ? "template" : "venue";
  const saved = useQuery(api.venueMaps.list, { kind }) as LiveMap[] | undefined;
  const saveMut = useMutation(api.venueMaps.save);
  const [view, setView] = useState<"list" | "edit">("list");
  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>(DEF_STAGE());
  const [sections, setSections] = useState<Section[]>([]);
  const [bg, setBg] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [selId, setSelId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const histRef = useRef<{ past: string[]; future: string[]; prev: string | undefined; t: number; applying: boolean }>({ past: [], future: [], prev: undefined, t: 0, applying: false });
  const freshHist = () => { histRef.current = { past: [], future: [], prev: undefined, t: 0, applying: false }; };

  const openMap = (v: LiveMap) => { freshHist(); setName(v.name); setStage({ ...(v.data.stage || DEF_STAGE()) }); setSections((v.data.sections || []).map((s) => ({ ...s }))); setBg(null); setSelId(null); setCurrentId(v._id); setView("edit"); };
  const create = () => { freshHist(); setName(isTpl ? "Untitled template" : "New venue map"); setStage(DEF_STAGE()); setSections([]); setBg(null); setSelId("stage"); setCurrentId(null); setView("edit"); };
  const startFromArena = () => { freshHist(); setName(isTpl ? "Arena template" : "New arena map"); setStage(DEF_STAGE()); setSections(STARTER_ARENA()); setBg(null); setSelId(null); setCurrentId(null); setView("edit"); };

  const map: VenueMap = { stage, sections };
  const sel = selId && selId !== "stage" ? sections.find((s) => s.id === selId) ?? null : null;
  const totalCap = sections.reduce((a, s) => a + seatsOf(s), 0);
  const patch = <K extends keyof Section>(id: string, k: K, v: Section[K]) =>
    setSections((p) => p.map((s) => (s.id === id ? { ...s, [k]: v } : s)));
  const moveSec = (id: string, x: number, y: number) => setSections((p) => p.map((s) => (s.id === id ? { ...s, x, y } : s)));
  const patchStage = (o: Partial<Stage>) => setStage((s) => ({ ...s, ...o }));
  const addSeated = () => { const id = newId("s"); setSections((p) => [...p, { id, kind: "seated", label: "Section " + ROWL(p.length), tier: "lower", x: 430, y: 230, rows: 5, cols: 10, colPitch: 16, rowPitch: 17, rot: 0, curve: 0 }]); setSelId(id); };
  const addGA = () => { const id = newId("s"); setSections((p) => [...p, { id, kind: "ga", label: "GA Zone", tier: "ga", x: 410, y: 270, w: 220, h: 90, capacity: 500 }]); setSelId(id); };
  const del = (id: string) => { setSections((p) => p.filter((s) => s.id !== id)); if (selId === id) setSelId(null); };
  const pasteSec = (s: Section) => { const copy: Section = { ...s, id: newId("s"), x: (s.x || 0) + 26, y: (s.y || 0) + 26, label: s.label.replace(/ copy$/, "") + " copy" }; setSections((p) => [...p, copy]); setSelId(copy.id); };
  const dup = (id: string) => { const s = sections.find((x) => x.id === id); if (s) pasteSec(s); };
  const nudge = (id: string, dx: number, dy: number) => setSections((p) => p.map((s) => (s.id === id ? { ...s, x: (s.x || 0) + dx, y: (s.y || 0) + dy } : s)));
  const save = async () => {
    const id = await saveMut({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (currentId ?? undefined) as any,
      kind,
      name,
      data: { stage, sections },
      capacity: totalCap,
    });
    setCurrentId(id as string);
    setToast(true);
    setTimeout(() => setToast(false), 1900);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => setBg(rd.result as string); rd.readAsDataURL(f); };

  // ---- undo / redo (coalesces rapid drag/slider bursts) ----
  const applyDoc = (d: Doc) => {
    histRef.current.applying = true;
    setStage(d.stage);
    setSections(d.sections);
    setBg(d.bg);
    setSelId((cur) => (cur === "stage" ? "stage" : d.sections.some((s) => s.id === cur) ? cur : null));
  };
  const undo = () => { const h = histRef.current; if (!h.past.length) return; h.future.push(JSON.stringify({ stage, sections, bg })); applyDoc(JSON.parse(h.past.pop() as string)); };
  const redo = () => { const h = histRef.current; if (!h.future.length) return; h.past.push(JSON.stringify({ stage, sections, bg })); applyDoc(JSON.parse(h.future.pop() as string)); };
  useEffect(() => {
    const h = histRef.current;
    const s = JSON.stringify({ stage, sections, bg });
    if (h.applying) { h.applying = false; h.prev = s; return; }
    if (h.prev === undefined) { h.prev = s; return; }
    if (s === h.prev) return;
    const now = Date.now();
    if (now - h.t > 350) { h.past.push(h.prev); if (h.past.length > 80) h.past.shift(); h.future = []; }
    h.t = now;
    h.prev = s;
  }, [stage, sections, bg]);

  // keyboard shortcuts — keep a "latest" ref the one-time listener reads from
  const apiRef = useRef({ selId, sections, dup, del, pasteSec, nudge, save, setSelId, undo, redo, editing: view === "edit" });
  useEffect(() => {
    apiRef.current = { selId, sections, dup, del, pasteSec, nudge, save, setSelId, undo, redo, editing: view === "edit" };
  });
  useEffect(() => {
    const clip: { cur: Section | null } = { cur: null };
    const onKey = (e: KeyboardEvent) => {
      const a = apiRef.current;
      if (!a.editing) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = (el?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const sec = a.selId && a.selId !== "stage" ? a.sections.find((s) => s.id === a.selId) ?? null : null;
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo(); }
      else if (mod && k === "y") { e.preventDefault(); a.redo(); }
      else if (mod && k === "c") { if (sec) { clip.cur = sec; e.preventDefault(); } }
      else if (mod && k === "v") { if (clip.cur) { a.pasteSec(clip.cur); e.preventDefault(); } }
      else if (mod && (k === "d" || k === "j")) { if (sec) { a.dup(sec.id); e.preventDefault(); } }
      else if (mod && k === "x") { if (sec) { clip.cur = sec; a.del(sec.id); e.preventDefault(); } }
      else if (mod && k === "s") { e.preventDefault(); a.save(); }
      else if (k === "delete" || k === "backspace") { if (sec) { a.del(sec.id); e.preventDefault(); } }
      else if (k === "escape") { a.setSelId(null); }
      else if (e.key.indexOf("Arrow") === 0) {
        if (!sec) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        a.nudge(sec.id, dx, dy);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (view === "list") {
    return (
      <div className="content-wide">
        <div className="toolbar">
          <div>
            <h2 style={{ fontSize: 20 }}>{isTpl ? "Venue templates" : "Venue maps"}</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{isTpl ? "Reusable seat-map blueprints any organizer can start from." : "Draw a seat map from scratch — or upload a floor plan and trace it."}</p>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-g" onClick={startFromArena}><Icon name="grid" size={15} /> Start from arena</button>
          <button className="btn btn-p" onClick={create}><Icon name="plus" size={16} /> {isTpl ? "New template" : "New from scratch"}</button>
        </div>
        <div className="ve-saved">
          {(saved ?? []).map((v) => (
            <div className="ve-card" key={v._id} onClick={() => openMap(v)}>
              <div className="thumb"><MiniMap map={{ stage: v.data.stage, sections: v.data.sections }} /></div>
              <div className="b"><div className="nm">{v.name}</div><div className="mt">{(v.capacity || 0).toLocaleString()} capacity · {(v.data.sections || []).length} sections</div></div>
            </div>
          ))}
          <div className="ve-newcard" onClick={create}>
            <div style={{ textAlign: "center" }}><Icon name="plus" size={26} /><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 8 }}>Blank canvas</div></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20, padding: "12px 14px", background: "var(--paper-2)", borderRadius: 12, fontSize: 12.5, color: "var(--ink-3)" }}>
          <Icon name="info" size={15} /> {isTpl ? "Templates seed new organizer venue maps." : "Maps power the buyer's seat picker — the same chart, in selection mode."}
        </div>
      </div>
    );
  }

  return (
    <div className="content-wide">
      <div className="ve-toolbar">
        <button className="btn btn-g btn-sm" onClick={() => setView("list")}><Icon name="left" size={15} /> All {isTpl ? "templates" : "maps"}</button>
        <input className="ve-name" value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-g btn-sm" onClick={undo} title="Undo (⌘Z)"><Icon name="left" size={15} /></button>
        <button className="btn btn-g btn-sm" onClick={redo} title="Redo (⌘⇧Z)"><Icon name="right" size={15} /></button>
        <span className="ve-cap">{sections.length} sections · {totalCap.toLocaleString()} cap</span>
        <button className="btn btn-p" onClick={save}><Icon name="check" size={16} /> Save {isTpl ? "template" : "map"}</button>
      </div>

      <div className="ve-tools">
        <button className="ve-tool" onClick={addSeated}><Icon name="grid" size={15} /> Seated block</button>
        <button className="ve-tool" onClick={addGA}><Icon name="user" size={15} /> GA zone</button>
        <button className="ve-tool" onClick={() => fileRef.current?.click()}><Icon name="share" size={15} /> Upload plan</button>
        <button className="ve-tool" onClick={() => setSelId("stage")}><Icon name="music" size={15} /> Stage</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      </div>

      <div className="ve-grid">
        <div className="ve-canvas-wrap">
          <VenueCanvas map={map} selId={selId} onSelect={setSelId} onMoveSec={moveSec} onStage={patchStage} bg={bg} bgOpacity={bgOpacity} />
          {bg && (
            <div className="ve-bgctl">
              <span style={{ fontSize: 11, fontWeight: 700 }}>Plan</span>
              <input className="ve-range" style={{ width: 80 }} type="range" min="0.1" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(+e.target.value)} />
              <button onClick={() => setBg(null)} style={{ width: 24, height: 24, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-3)" }}><Icon name="x" size={14} /></button>
            </div>
          )}
          <span className="ve-zoomhint">drag to move · ⌘Z undo · ⌘C/V copy · ⌫ delete · arrows nudge</span>
        </div>

        <div className="ve-insp">
          <Panel title="Sections" pad>
            <div className="ve-seclist">
              <div className={"ve-secitem" + (selId === "stage" ? " on" : "")} onClick={() => setSelId("stage")}>
                <span className="sw" style={{ background: "var(--ink)" }} /><span className="nm">Stage</span><span className="cap">{stage.w}×{stage.h}</span>
              </div>
              {sections.map((s) => (
                <div key={s.id} className={"ve-secitem" + (s.id === selId ? " on" : "")} onClick={() => setSelId(s.id)}>
                  <span className="sw" style={{ background: VE_TIER[s.tier]?.c, opacity: s.kind === "ga" ? 0.5 : 1, border: s.kind === "ga" ? "1.5px dashed var(--ink-3)" : "none" }} />
                  <span className="nm">{s.label}</span><span className="cap">{seatsOf(s).toLocaleString()}</span>
                  <button className="del" onClick={(e) => { e.stopPropagation(); del(s.id); }}><Icon name="x" size={14} /></button>
                </div>
              ))}
              {!sections.length && <div className="muted" style={{ fontSize: 12.5, padding: "8px 4px" }}>Empty canvas. Add a seated block or GA zone, or upload a floor plan to trace.</div>}
            </div>
          </Panel>

          {selId === "stage" && (
            <Panel title="Stage" pad>
              <div className="fld ve-mini"><label>Label</label><input className="inp" value={stage.label} onChange={(e) => patchStage({ label: e.target.value })} /></div>
              <div className="ve-field-row">
                <NumF label="Width" value={stage.w} onChange={(v) => patchStage({ w: Math.max(60, v) })} min={60} />
                <NumF label="Height" value={stage.h} onChange={(v) => patchStage({ h: Math.max(20, v) })} min={20} />
              </div>
              <RotRow value={stage.rot} onChange={(v) => patchStage({ rot: v })} />
              <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>Drag the stage on the canvas to move it; pull its corner handle to resize.</p>
            </Panel>
          )}

          {sel && (
            <Panel title={sel.kind === "ga" ? "GA zone" : "Seated section"} pad>
              <div className="fld ve-mini"><label>Label</label><input className="inp" value={sel.label} onChange={(e) => patch(sel.id, "label", e.target.value)} /></div>
              <div className="fld ve-mini"><label>Tier</label>
                <div className="ve-tierpick">
                  {VE_TIERS.filter((t) => (sel.kind === "ga" ? t.id === "ga" : t.id !== "ga")).map((t) => (
                    <span key={t.id} className={"tp" + (sel.tier === t.id ? " on" : "")} style={{ background: t.c }} title={t.name} onClick={() => patch(sel.id, "tier", t.id)} />
                  ))}
                </div>
              </div>
              {sel.kind === "ga" ? (
                <>
                  <div className="ve-field-row"><NumF label="Width" value={sel.w || 0} onChange={(v) => patch(sel.id, "w", Math.max(40, v))} min={40} /><NumF label="Height" value={sel.h || 0} onChange={(v) => patch(sel.id, "h", Math.max(40, v))} min={40} /></div>
                  <NumF label="Standing capacity" value={sel.capacity || 0} onChange={(v) => patch(sel.id, "capacity", Math.max(0, v))} min={0} />
                  <RotRow value={sel.rot} onChange={(v) => patch(sel.id, "rot", v)} />
                </>
              ) : (
                <>
                  <div className="ve-field-row"><NumF label="Rows" value={sel.rows || 1} onChange={(v) => patch(sel.id, "rows", Math.max(1, v || 1))} min={1} max={40} /><NumF label="Seats / row" value={sel.cols || 1} onChange={(v) => patch(sel.id, "cols", Math.max(1, v || 1))} min={1} max={60} /></div>
                  <div className="ve-field-row"><NumF label="Seat gap" value={sel.colPitch || 16} onChange={(v) => patch(sel.id, "colPitch", Math.max(13, v || 16))} min={13} max={40} /><NumF label="Row gap" value={sel.rowPitch || 17} onChange={(v) => patch(sel.id, "rowPitch", Math.max(13, v || 17))} min={13} max={40} /></div>
                  <div className="fld ve-mini"><label>Curve: {sel.curve || 0}°</label><input className="ve-range" type="range" min="-120" max="120" value={sel.curve || 0} onChange={(e) => patch(sel.id, "curve", +e.target.value)} /></div>
                  <RotRow value={sel.rot} onChange={(v) => patch(sel.id, "rot", v)} />
                  <div className="ve-cap" style={{ display: "inline-block", marginTop: 2 }}>{seatsOf(sel).toLocaleString()} seats · rows {ROWL(0)}–{ROWL((sel.rows || 1) - 1)}</div>
                </>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn btn-g btn-sm" style={{ flex: 1 }} onClick={() => dup(sel.id)}><Icon name="plus" size={14} /> Duplicate</button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => del(sel.id)}><Icon name="x" size={14} /> Remove</button>
              </div>
            </Panel>
          )}

          <div className="card" style={{ padding: 13, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "#e2f1f7", color: "var(--blue)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="map" size={17} /></span>
            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{isTpl ? "Templates seed new organizer venue maps." : "Buyers pick seats from this exact chart."}</span>
          </div>
        </div>
      </div>

      {toast && <div className="bo-ve-toast"><Icon name="check" size={15} /> {isTpl ? "Template" : "Venue map"} saved · {totalCap.toLocaleString()} capacity</div>}
    </div>
  );
}
