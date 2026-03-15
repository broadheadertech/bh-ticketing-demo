"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Props = { eventId: string };

const containerClass = "rounded-lg border p-3 max-w-sm w-full text-center";

export function EntryCounter({ eventId }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = useQuery(api.tickets.getEntryStats, { eventId: eventId as any });

  if (stats === undefined) {
    return (
      <div className={containerClass}>
        <p className="text-muted-foreground text-sm">Loading entry count...</p>
      </div>
    );
  }

  return (
    <div className={containerClass} aria-live="polite">
      <p className="text-2xl font-bold">
        {stats.scanned} / {stats.total}
      </p>
      <p className="text-sm text-muted-foreground">checked in</p>
    </div>
  );
}
