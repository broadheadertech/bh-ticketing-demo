// format.ts — money + date helpers shared by all screens.
//
// IMPORTANT: prices from Convex are stored in CENTAVOS (integer). Always pass
// the raw centavos value to `money()` — it divides by 100 for you.

const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PESO_WHOLE = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** centavos (e.g. 150000) -> "₱1,500.00" */
export function money(centavos: number): string {
  return PESO.format((centavos ?? 0) / 100);
}

/** centavos -> "₱1,500" (no decimals; for compact poster price tags) */
export function moneyWhole(centavos: number): string {
  return PESO_WHOLE.format(Math.round((centavos ?? 0) / 100));
}

const DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const TIME_FMT = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** epoch ms -> "Sat, Jun 15" */
export function formatDate(ms: number): string {
  return DATE_FMT.format(new Date(ms));
}

/** epoch ms -> "7:30 PM" */
export function formatTime(ms: number): string {
  return TIME_FMT.format(new Date(ms));
}

/** epoch ms -> "Sat, Jun 15, 7:30 PM" */
export function formatDateTime(ms: number): string {
  return DATETIME_FMT.format(new Date(ms));
}
