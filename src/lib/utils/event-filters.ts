export type DateRangeFilter = "all" | "today" | "this_weekend" | "this_month";

export function filterEventsByDateRange<T extends { date: number }>(
  events: T[],
  range: DateRangeFilter | null,
  now = Date.now()
): T[] {
  if (!range || range === "all") return events;

  const nowDate = new Date(now);
  const startOfDay = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate()
  ).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  if (range === "today") {
    return events.filter((e) => e.date >= startOfDay && e.date <= endOfDay);
  }

  if (range === "this_weekend") {
    const dayOfWeek = nowDate.getDay(); // 0=Sun, 6=Sat
    // If today is Sat or Sun, weekend starts today; otherwise next Friday
    const daysUntilSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const fridayStart =
      dayOfWeek === 0
        ? startOfDay - 2 * 24 * 60 * 60 * 1000 // Sunday — go back to Friday
        : startOfDay + (dayOfWeek === 6 ? 0 : 5 - dayOfWeek) * 24 * 60 * 60 * 1000; // Sat: today, Weekday: advance to Friday
    const sundayEnd =
      startOfDay + daysUntilSun * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 - 1;
    return events.filter((e) => e.date >= fridayStart && e.date <= sundayEnd);
  }

  if (range === "this_month") {
    const monthStart = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      1
    ).getTime();
    const monthEnd = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime();
    return events.filter((e) => e.date >= monthStart && e.date <= monthEnd);
  }

  return events;
}

export function filterEventsByStatus<T extends { status: string }>(
  events: T[],
  status: string | null
): T[] {
  if (!status || status === "all") return events;
  return events.filter((e) => e.status === status);
}

export function filterEventsByType<T extends { eventType: string }>(
  events: T[],
  type: string | null
): T[] {
  if (!type || type === "all") return events;
  return events.filter((e) => e.eventType === type);
}
