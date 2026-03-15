"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { AVAILABILITY_STATUSES, type AvailabilityStatus } from "@/lib/validators/venue-availability";

// Keep TypeScript happy — used as any since Convex ID type isn't importable here
type VenueId = Parameters<typeof api.venueAvailability.getAvailabilityByVenue>[0]["venueId"];

const STATUS_STYLES: Record<string, string> = {
  available: "",
  tentative: "bg-amber-100 border-amber-400 text-amber-900",
  booked: "bg-red-100 border-red-400 text-red-900",
};

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface AvailabilityCalendarProps {
  venueId: string;
}

export function AvailabilityCalendar({ venueId }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>("available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const records = useQuery(api.venueAvailability.getAvailabilityByVenue, {
    venueId: venueId as VenueId,
  });
  const setAvailabilityMutation = useMutation(api.venueAvailability.setVenueAvailability);

  // Build statusMap: date string → record
  const statusMap = useMemo(() => {
    const m: Record<string, (typeof records)[0]> = {};
    records?.forEach((r) => {
      m[r.date] = r;
    });
    return m;
  }, [records]);

  // Month grid calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr);
    const existing = statusMap[dateStr];
    setSelectedStatus((existing?.status as AvailabilityStatus) ?? "available");
    setNotes(existing?.notes ?? "");
  }

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await setAvailabilityMutation({
        venueId: venueId as VenueId,
        date: selectedDate,
        status: selectedStatus,
        notes: notes.trim() || undefined,
      });
      showSuccess("Availability saved");
    } catch (err) {
      showErrorFromCatch(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Month navigation header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold">
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

      {/* Loading state */}
      {records === undefined && (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Calendar grid */}
      {records !== undefined && (
        <div className="grid grid-cols-7 gap-1">
          {/* Day-of-week headers */}
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center text-xs text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}

          {/* Padding cells for day-of-week offset */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const record = statusMap[dateStr];
            const status = (record?.status as AvailabilityStatus) ?? "available";
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                className={cn(
                  "aspect-square w-full rounded-md border text-sm font-medium flex items-center justify-center transition-colors",
                  "hover:bg-muted",
                  isToday(day) && "ring-2 ring-primary",
                  isSelected && "ring-2 ring-primary ring-offset-1",
                  STATUS_STYLES[status]
                )}
                aria-label={`${dateStr}: ${status}`}
                aria-pressed={isSelected}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-amber-400 bg-amber-100" />
          Tentative
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-red-400 bg-red-100" />
          Booked
        </span>
      </div>

      {/* Status editor panel */}
      {selectedDate && (
        <div className="mt-4 p-4 border rounded-lg space-y-3">
          <p className="font-medium text-sm">
            {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
          </p>

          <Select
            value={selectedStatus}
            onValueChange={(v) => setSelectedStatus(v as AvailabilityStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="tentative">Tentatively Held</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
          />

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedDate(null)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
