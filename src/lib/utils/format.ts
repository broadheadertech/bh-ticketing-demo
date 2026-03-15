const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/**
 * Format integer centavos to PHP currency display.
 * PHP 300.00 = 30000 centavos. Returns "Free" for 0.
 */
export function formatCurrency(centavos: number): string {
  if (centavos === 0) return "Free";
  return currencyFormatter.format(centavos / 100);
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Format a timestamp to a localized date string (en-PH).
 */
export function formatDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp));
}

/**
 * Format a timestamp to a localized date+time string (en-PH).
 */
export function formatDateTime(timestamp: number): string {
  return dateTimeFormatter.format(new Date(timestamp));
}
