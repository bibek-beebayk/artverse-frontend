/** Parses a backend decimal-string price (e.g. Product.startingPrice) into a plain number for
 * display/comparison. Never returns 0 for a missing/invalid value — null means "no price," and
 * callers must treat that as "unavailable," never as free. */
export function parseStartingPrice(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/** Formats a backend starting-price string as a "From $X.XX" label, or null when there's no
 * valid price to show — callers must render their own "Currently unavailable" copy in that case
 * rather than falling back to "$0.00" or any other synthetic price. */
export function formatStartingPrice(value: string | null | undefined, currency = 'USD'): string | null {
  const parsed = parseStartingPrice(value);
  if (parsed === null) {
    return null;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);

  return `From ${formatted}`;
}
