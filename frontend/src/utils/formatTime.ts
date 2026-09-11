/**
 * Formats duration in minutes to human-readable study time string.
 * Examples:
 *   - 0 min -> "0 min"
 *   - 45 min -> "45 min"
 *   - 60 min -> "1 hr"
 *   - 105 min -> "1 hr 45 min"
 *   - 280 min -> "4 hrs 40 min"
 */
export function formatStudyTime(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return '0 min';
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h} hr${h > 1 ? 's' : ''} ${m} min`;
}

/**
 * Formats duration in compact form.
 * Examples:
 *   - 0 min -> "0m"
 *   - 45 min -> "45m"
 *   - 60 min -> "1h"
 *   - 105 min -> "1h 45m"
 */
export function formatStudyTimeCompact(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return '0m';
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
