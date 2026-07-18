import { BUSINESS_TIMEZONE, DASHBOARD_MAX_RANGE_DAYS } from "@/lib/dashboard/constants";

export type DashboardRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "custom";

export type DashboardPeriod = {
  preset: DashboardRangePreset;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  label: string;
  previousLabel: string;
  bucket: "hour" | "day" | "week";
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getZonedParts(date: Date, timeZone = BUSINESS_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Approximate UTC instant for a wall-clock time in America/Santiago. */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = getZonedParts(utcGuess);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(utcGuess.getTime() + (desired - asUtc));
}

export function startOfZonedDay(date: Date) {
  const parts = getZonedParts(date);
  return zonedDateTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0);
}

export function addZonedDays(date: Date, days: number) {
  const parts = getZonedParts(date);
  const mid = zonedDateTimeToUtc(parts.year, parts.month, parts.day, 12, 0, 0);
  mid.setUTCDate(mid.getUTCDate() + days);
  return startOfZonedDay(mid);
}

function formatDayLabel(date: Date) {
  const parts = getZonedParts(date);
  return `${pad(parts.day)}-${pad(parts.month)}-${parts.year}`;
}

function formatRangeLabel(from: Date, toExclusive: Date) {
  const end = addZonedDays(toExclusive, -1);
  if (startOfZonedDay(from).getTime() === startOfZonedDay(end).getTime()) {
    return formatDayLabel(from);
  }
  return `${formatDayLabel(from)} → ${formatDayLabel(end)}`;
}

function daysBetween(from: Date, toExclusive: Date) {
  return Math.max(
    1,
    Math.round((toExclusive.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function withPrevious(from: Date, to: Date, preset: DashboardRangePreset, label: string): DashboardPeriod {
  const durationMs = to.getTime() - from.getTime();
  const previousTo = from;
  const previousFrom = new Date(from.getTime() - durationMs);
  const dayCount = daysBetween(from, to);
  const bucket: DashboardPeriod["bucket"] =
    dayCount <= 1 ? "hour" : dayCount <= 62 ? "day" : "week";

  return {
    preset,
    from,
    to,
    previousFrom,
    previousTo,
    label,
    previousLabel: formatRangeLabel(previousFrom, previousTo),
    bucket,
  };
}

export function resolveDashboardPeriod(input: {
  range?: string;
  from?: string;
  to?: string;
  now?: Date;
}): DashboardPeriod {
  const now = input.now ?? new Date();
  const today = startOfZonedDay(now);
  const range = input.range ?? (input.from && input.to ? "custom" : "7d");

  if (range === "today") {
    const from = today;
    const to = addZonedDays(today, 1);
    return withPrevious(from, to, "today", "Hoy");
  }

  if (range === "yesterday") {
    const from = addZonedDays(today, -1);
    const to = today;
    return withPrevious(from, to, "yesterday", "Ayer");
  }

  if (range === "30d") {
    const to = addZonedDays(today, 1);
    const from = addZonedDays(to, -30);
    return withPrevious(from, to, "30d", "Últimos 30 días");
  }

  if (range === "this_month") {
    const parts = getZonedParts(now);
    const from = zonedDateTimeToUtc(parts.year, parts.month, 1);
    const to = addZonedDays(today, 1);
    return withPrevious(from, to, "this_month", "Este mes");
  }

  if (range === "last_month") {
    const parts = getZonedParts(now);
    const thisMonthStart = zonedDateTimeToUtc(parts.year, parts.month, 1);
    const from = addZonedDays(thisMonthStart, -1);
    const fromParts = getZonedParts(from);
    const previousMonthStart = zonedDateTimeToUtc(
      fromParts.year,
      fromParts.month,
      1,
    );
    return withPrevious(
      previousMonthStart,
      thisMonthStart,
      "last_month",
      "Mes anterior",
    );
  }

  if (range === "custom" && input.from && input.to) {
    const fromParts = input.from.slice(0, 10).split("-").map(Number);
    const toParts = input.to.slice(0, 10).split("-").map(Number);
    const from = zonedDateTimeToUtc(fromParts[0]!, fromParts[1]!, fromParts[2]!);
    const toInclusive = zonedDateTimeToUtc(toParts[0]!, toParts[1]!, toParts[2]!);
    const to = addZonedDays(toInclusive, 1);
    const dayCount = daysBetween(from, to);
    if (dayCount > DASHBOARD_MAX_RANGE_DAYS) {
      const clampedTo = addZonedDays(from, DASHBOARD_MAX_RANGE_DAYS);
      return withPrevious(
        from,
        clampedTo,
        "custom",
        formatRangeLabel(from, clampedTo),
      );
    }
    return withPrevious(from, to, "custom", formatRangeLabel(from, to));
  }

  const to = addZonedDays(today, 1);
  const from = addZonedDays(to, -7);
  return withPrevious(from, to, "7d", "Últimos 7 días");
}

export function formatZonedDateInput(date: Date) {
  const parts = getZonedParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function dashboardHref(
  period: Pick<DashboardPeriod, "preset" | "from" | "to">,
) {
  const params = new URLSearchParams();
  if (period.preset === "custom") {
    params.set("from", formatZonedDateInput(period.from));
    params.set("to", formatZonedDateInput(addZonedDays(period.to, -1)));
  } else if (period.preset !== "7d") {
    params.set("range", period.preset);
  }
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}
