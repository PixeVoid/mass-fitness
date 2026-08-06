/**
 * Class times, and repeating them.
 *
 * Two problems, and the second is why the first had to be fixed.
 *
 * **What "7:00am" means.** A `datetime-local` input yields a wall-clock string
 * with no timezone — "2026-08-10T07:00". Passing that to `new Date()` parses
 * it in the *server's* zone, which is UTC in production. So an admin picking
 * 7:00am was scheduling 7:00am UTC, which members saw as 12:30pm IST, and the
 * form's own label claimed it was the admin's device timezone, which it was
 * not either. Class times are now IST, explicitly, everywhere: the members are
 * in India, `formatClassTime` already renders IST, and an admin who is
 * travelling means "the usual 7am class", not 7am wherever they happen to be.
 *
 * **Repeating it.** Adding a week to an instant only preserves the wall clock
 * if the offset is constant across the gap. IST has no daylight saving and has
 * not moved since 1945, so exact seven-day arithmetic is correct here — and it
 * is correct *because* of that fact, not by accident, which is why the times
 * are pinned to IST rather than to whatever the server is set to.
 */

/** +05:30, fixed. India has no daylight saving. */
export const IST_OFFSET = "+05:30";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Sunday = 0, matching `Date.prototype.getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

/**
 * Reads a `datetime-local` value as an IST instant.
 *
 * Returns null on anything that is not exactly the shape the input produces,
 * rather than letting `new Date()` guess — a half-parsed date that silently
 * becomes a real instant is how a class ends up scheduled in 2001.
 */
export function parseIstLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(
    value.trim(),
  );
  if (!match) return null;

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00${IST_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Renders an instant back into a `datetime-local` value in IST, for edit
 * forms. Without this an edit form would show the UTC wall clock and every
 * save would shift the class by five and a half hours.
 */
export function toIstLocalInput(date: Date): string {
  const parts = istParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Which day of the week an instant falls on, in IST rather than in UTC. */
export function istWeekday(date: Date): Weekday {
  // Shifting by the offset and reading UTC fields avoids depending on the
  // server's own timezone, which is the bug this module exists to remove.
  const shifted = new Date(date.getTime() + 330 * 60_000);
  return shifted.getUTCDay() as Weekday;
}

export interface RecurrenceInput {
  /** The first session. Its time of day is used for every occurrence. */
  first: Date;
  /**
   * Days to run on. The first session's own weekday is always included —
   * scheduling a Monday and ticking only Wednesday should not silently move
   * the class the admin just picked.
   */
  weekdays: readonly Weekday[];
  /** How many weeks the routine runs for, including the first. */
  weeks: number;
}

/** Hard ceiling. A year of daily classes is 365 rows from one careless form. */
export const MAX_WEEKS = 26;
export const MAX_OCCURRENCES = 120;

/**
 * Every session in a repeating routine, earliest first.
 *
 * The first date is always included and is always the one the admin chose.
 * Later days in that same first week are included too — a Mon/Wed/Fri routine
 * started on a Monday runs that Wednesday and Friday, not from next week.
 */
export function buildRecurrence(input: RecurrenceInput): Date[] {
  const weeks = Math.max(1, Math.min(Math.floor(input.weeks), MAX_WEEKS));

  const firstWeekday = istWeekday(input.first);
  const days = new Set<Weekday>(input.weekdays);
  days.add(firstWeekday);

  const out: Date[] = [];

  for (let week = 0; week < weeks; week += 1) {
    for (const day of days) {
      // Offset from the first session's weekday, forward only. A Wednesday in
      // a routine that starts on Friday belongs to the following week, not to
      // two days before the class was scheduled.
      const dayOffset = (day - firstWeekday + 7) % 7;
      const time =
        input.first.getTime() + week * WEEK_MS + dayOffset * 24 * 60 * 60 * 1000;

      out.push(new Date(time));
    }
  }

  out.sort((a, b) => a.getTime() - b.getTime());
  return out.slice(0, MAX_OCCURRENCES);
}

/** "Mon, Wed & Fri" — for the series summary line. */
export function describeWeekdays(weekdays: readonly Weekday[]): string {
  const ordered = WEEKDAY_LABELS.filter((day) => weekdays.includes(day.value));
  if (ordered.length === 0) return "";
  if (ordered.length === 1) return ordered[0].short;

  const shorts = ordered.map((day) => day.short);
  return `${shorts.slice(0, -1).join(", ")} & ${shorts[shorts.length - 1]}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function istParts(date: Date) {
  const shifted = new Date(date.getTime() + 330 * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** "Sat 26 Jul, 7:00 am" in IST — the timezone every member is actually in. */
export function formatClassTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}
