"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  available: "",
  tentative: "bg-amber-100 border-amber-400 text-amber-900",
  booked: "bg-red-100 border-red-400 text-red-900",
};

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface VenueAvailabilityReadonlyProps {
  venueId: string;
}

export function VenueAvailabilityReadonly({
  venueId,
}: VenueAvailabilityReadonlyProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const records = useQuery(api.venueAvailability.getPublicVenueAvailability, {
    venueId: venueId as any,
  });

  const statusMap = useMemo(() => {
    const m: Record<string, { status: string }> = {};
    records?.forEach((r) => {
      m[r.date] = r;
    });
    return m;
  }, [records]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  return (
    <div className="max-w-sm space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {records === undefined && (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {records !== undefined && (
        <div className="grid grid-cols-7 gap-1">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center text-xs text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}

          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const status = statusMap[dateStr]?.status ?? "available";

            return (
              <div
                key={dateStr}
                className={cn(
                  "aspect-square w-full rounded-md border text-xs font-medium flex items-center justify-center",
                  isToday(day) && "ring-1 ring-primary",
                  STATUS_STYLES[status]
                )}
                aria-label={`${dateStr}: ${status}`}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-amber-400 bg-amber-100" />
          Tentative
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-red-400 bg-red-100" />
          Booked
        </span>
      </div>
    </div>
  );
}
