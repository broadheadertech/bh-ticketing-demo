"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/custom/role-guard";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { ArrowLeft, Flag, Trophy, Plus, Trash2, ExternalLink } from "lucide-react";

type ResultRow = { bib: string; name: string; timeText: string; rank: string; note: string };

function WaiverCard({ eventId }: { eventId: Id<"events"> }) {
  const data = useQuery(api.races.listSignaturesForEvent, { eventId });
  const setText = useMutation(api.races.setWaiverText);
  const [text, setText_] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed the editor once from the server value.
  useEffect(() => {
    if (data && text === null) setText_(data.waiverText);
  }, [data, text]);

  async function save() {
    setSaving(true);
    try {
      await setText({ eventId, waiverText: text ?? "" });
      showSuccess("Waiver saved");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setSaving(false);
    }
  }

  const signedCount = (data?.rows ?? []).filter((r) => r.signedAt).length;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Liability waiver</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Attendees must accept this before the race. Leave empty to disable. They sign it from
          their tickets page.
        </p>
        <Textarea
          value={text ?? ""}
          onChange={(e) => setText_(e.target.value)}
          placeholder="I acknowledge the risks of participating in this event…"
          className="min-h-32"
        />
        <Button size="sm" onClick={save} disabled={saving || text === null}>
          {saving ? "Saving…" : "Save waiver"}
        </Button>

        {data && data.rows.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">
              Signatures{" "}
              <Badge variant="secondary">
                {signedCount}/{data.rows.length}
              </Badge>
            </p>
            <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
              {data.rows.map((r) => (
                <div
                  key={String(r.ticketId)}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="truncate">{r.buyerEmail}</span>
                  {r.signedAt ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {r.signerName}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unsigned</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsCard({ eventId }: { eventId: Id<"events"> }) {
  const saved = useQuery(api.races.getResultsForEditor, { eventId });
  const save = useMutation(api.races.saveResults);
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saved && rows === null) {
      setRows(
        saved.length
          ? saved.map((r) => ({
              bib: r.bib,
              name: r.name,
              timeText: r.timeText,
              rank: r.rank != null ? String(r.rank) : "",
              note: r.note,
            }))
          : [{ bib: "", name: "", timeText: "", rank: "", note: "" }]
      );
    }
  }, [saved, rows]);

  function update(i: number, key: keyof ResultRow, value: string) {
    setRows((prev) =>
      (prev ?? []).map((r, idx) => (idx === i ? { ...r, [key]: value } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...(prev ?? []), { bib: "", name: "", timeText: "", rank: "", note: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => (prev ?? []).filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        eventId,
        rows: (rows ?? [])
          .filter((r) => r.name.trim() || r.bib.trim())
          .map((r) => ({
            bib: r.bib,
            name: r.name,
            timeText: r.timeText || undefined,
            rank: r.rank.trim() ? Number(r.rank) : undefined,
            note: r.note || undefined,
          })),
      });
      showSuccess("Results saved");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Results / leaderboard</h2>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${eventId}/leaderboard`} target="_blank">
              Public view <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter finishers. Rank orders the leaderboard; leave it blank to keep entry order.
        </p>

        {rows === null ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[60px_1fr_110px_70px_1fr_36px] gap-2 px-1 text-xs text-muted-foreground">
              <span>Bib</span>
              <span>Name</span>
              <span>Time</span>
              <span>Rank</span>
              <span>Note</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-2 sm:grid-cols-[60px_1fr_110px_70px_1fr_36px] gap-2"
              >
                <Input value={r.bib} onChange={(e) => update(i, "bib", e.target.value)} placeholder="Bib" />
                <Input value={r.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Name" />
                <Input value={r.timeText} onChange={(e) => update(i, "timeText", e.target.value)} placeholder="00:00:00" />
                <Input value={r.rank} onChange={(e) => update(i, "rank", e.target.value)} placeholder="#" inputMode="numeric" />
                <Input value={r.note} onChange={(e) => update(i, "note", e.target.value)} placeholder="Category / DNF" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeRow(i)}
                  aria-label="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Add finisher
            </Button>
          </div>
        )}

        <Button size="sm" onClick={handleSave} disabled={saving || rows === null}>
          {saving ? "Saving…" : "Save results"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RacePage() {
  const params = useParams();
  const eventId = params.eventId as Id<"events">;

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/events/${eventId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Flag className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Race Setup</h1>
          </div>
        </div>
        <WaiverCard eventId={eventId} />
        <ResultsCard eventId={eventId} />
      </div>
    </RoleGuard>
  );
}
