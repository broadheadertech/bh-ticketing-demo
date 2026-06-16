"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, Check, Plus } from "lucide-react";

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
};

export function ParticipantPicker({ value, onChange }: Props) {
  const roster = useQuery(api.participants.listMine);
  const create = useMutation(api.participants.create);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const all = (roster ?? []).map((p) => ({
    id: String(p._id),
    name: p.name,
    role: p.role,
  }));
  const byId = new Map(all.map((a) => [a.id, a]));
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const ql = q.trim().toLowerCase();
  const shown = all.filter((a) => !ql || a.name.toLowerCase().includes(ql));
  const exact = all.some((a) => a.name.toLowerCase() === ql);

  const addNew = async () => {
    if (!q.trim()) return;
    setAdding(true);
    try {
      const id = await create({ name: q.trim() });
      onChange([...value, String(id)]);
      setQ("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {byId.get(id)?.name ?? "—"}
              <button type="button" aria-label="Remove" onClick={() => toggle(id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search your roster…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
        {roster === undefined ? (
          <p className="p-3 text-sm text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {all.length === 0 ? "Your roster is empty." : `No match for “${q}”.`}
          </p>
        ) : (
          shown.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => toggle(a.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
            >
              <span className="truncate">
                <span className="font-medium">{a.name}</span>
                {a.role && <span className="text-muted-foreground text-xs"> · {a.role}</span>}
              </span>
              {value.includes(a.id) && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))
        )}
      </div>
      {ql && !exact && (
        <Button type="button" variant="outline" size="sm" disabled={adding} onClick={addNew}>
          <Plus className="h-4 w-4 mr-1" />
          Add “{q.trim()}” to roster
        </Button>
      )}
    </div>
  );
}
