"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/format";
import { Trophy, ArrowLeft, Medal } from "lucide-react";

const MEDAL = ["text-amber-500", "text-gray-400", "text-amber-700"];

export default function LeaderboardPage() {
  const params = useParams();
  const eventId = params.eventId as Id<"events">;
  const data = useQuery(api.races.getResultsPublic, { eventId });

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold leading-tight">{data.eventTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Results{data.eventDate > 0 ? ` · ${formatDate(data.eventDate)}` : ""}
          </p>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Results haven&apos;t been posted yet. Check back after the race.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 w-14">#</th>
                <th className="px-4 py-2.5 w-16">Bib</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rows.map((r, i) => {
                const place = r.rank ?? i + 1;
                return (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        {place <= 3 ? (
                          <Medal className={`h-4 w-4 ${MEDAL[place - 1]}`} />
                        ) : null}
                        {place}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.bib || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{r.name}</span>
                      {r.note ? (
                        <span className="ml-2 text-xs text-muted-foreground">{r.note}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.timeText || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
