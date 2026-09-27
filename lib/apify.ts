export type PopularTimeHour = {
  hour: number;
  popularity: number;
};

export type PopularTimeDay = {
  day: string;
  hours: PopularTimeHour[];
};

export type VenueActivity = {
  source: "Apify Google Places";
  placeId: string;
  observedAt: string;
  title?: string;
  category?: string;
  address?: string;
  menuUrl?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  openingHours: Array<{ day: string; hours: string }>;
  popularTimes: PopularTimeDay[];
  reviewTopics: Array<{ topic: string; count: number }>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function firstNumber(record: JsonRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = finiteNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeDayName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const day = value.trim().toLowerCase();
  if (!day) return undefined;
  const actorAbbreviations: Record<string, string> = {
    mo: "Monday",
    tu: "Tuesday",
    we: "Wednesday",
    th: "Thursday",
    fr: "Friday",
    sa: "Saturday",
    su: "Sunday",
  };
  if (actorAbbreviations[day]) return actorAbbreviations[day];
  const match = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].find(
    (name) => name.toLowerCase() === day,
  );
  return match ?? undefined;
}

function normalizeHours(value: unknown): PopularTimeHour[] {
  const candidates = Array.isArray(value)
    ? value
    : isRecord(value)
      ? Object.entries(value).map(([hour, item]) => ({ hour: Number(hour), value: item }))
      : [];
  const normalized: PopularTimeHour[] = [];
  candidates.forEach((candidate, index) => {
    const object = isRecord(candidate) ? candidate : { value: candidate };
    const hour = firstNumber(object, ["hour", "time", "hourOfDay"]) ?? index;
    const popularity =
      firstNumber(object, ["popularity", "occupancyPercent", "busyness", "value", "percent"]) ??
      finiteNumber(object.value);
    if (popularity === undefined || hour < 0 || hour > 23) return;
    normalized.push({ hour: Math.round(hour), popularity: Math.max(0, Math.min(100, popularity)) });
  });
  return normalized;
}

function normalizePopularTimes(raw: unknown): PopularTimeDay[] {
  const days: PopularTimeDay[] = [];
  const addDay = (dayValue: unknown, value: unknown) => {
    const day = normalizeDayName(dayValue);
    if (!day) return;
    const wrapper = isRecord(value) ? value : undefined;
    const hourly =
      (wrapper && (wrapper.hours ?? wrapper.popularTimes ?? wrapper.histogram ?? wrapper.data)) ??
      value;
    const hours = normalizeHours(hourly);
    if (hours.length > 0) days.push({ day, hours });
  };

  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (!isRecord(entry)) return;
      addDay(entry.day ?? entry.dayOfWeek ?? entry.name, entry);
    });
  } else if (isRecord(raw)) {
    for (const [day, value] of Object.entries(raw)) addDay(day, value);
  }

  return days;
}

function normalizeReviewTopics(raw: unknown): Array<{ topic: string; count: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.title !== "string") return [];
      const count = finiteNumber(entry.count);
      return count === undefined ? [] : [{ topic: entry.title, count }];
    })
    .sort((a, b) => b.count - a.count);
}

function normalizeOpeningHours(raw: unknown): Array<{ day: string; hours: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const day = normalizeDayName(entry.day);
    const hours = typeof entry.hours === "string" ? entry.hours.trim() : "";
    return day && hours ? [{ day, hours }] : [];
  });
}

export function normalizeVenueActivity(
  raw: unknown,
  requestedPlaceId?: string,
  observedAt = new Date().toISOString(),
): VenueActivity | null {
  if (!isRecord(raw)) return null;
  const placeId = typeof raw.placeId === "string" ? raw.placeId : requestedPlaceId;
  if (!placeId) return null;

  const rating = firstNumber(raw, ["totalScore", "rating"]);
  const reviewCount = firstNumber(raw, ["reviewsCount", "reviewCount"]);
  const priceRange = typeof raw.price === "string" ? raw.price.trim() : undefined;
  const title = typeof raw.title === "string" ? raw.title : undefined;
  const category = typeof raw.categoryName === "string" ? raw.categoryName : undefined;
  const address = typeof raw.address === "string" ? raw.address : undefined;
  const menuUrl = safeExternalUrl(raw.menu);
  const location = isRecord(raw.location) ? raw.location : undefined;
  const latitude = location ? finiteNumber(location.lat) : undefined;
  const longitude = location ? finiteNumber(location.lng) : undefined;
  const popularitySource = raw.popularTimesHistogram ?? raw.popularTimes;
  const actorObservedAt =
    typeof raw.scrapedAt === "string" && Number.isFinite(Date.parse(raw.scrapedAt))
      ? new Date(raw.scrapedAt).toISOString()
      : observedAt;

  return {
    source: "Apify Google Places",
    placeId,
    observedAt: actorObservedAt,
    ...(title ? { title } : {}),
    ...(category ? { category } : {}),
    ...(address ? { address } : {}),
    ...(menuUrl ? { menuUrl } : {}),
    ...(latitude === undefined ? {} : { latitude }),
    ...(longitude === undefined ? {} : { longitude }),
    ...(rating === undefined ? {} : { rating }),
    ...(reviewCount === undefined ? {} : { reviewCount }),
    ...(priceRange ? { priceRange } : {}),
    openingHours: normalizeOpeningHours(raw.openingHours),
    popularTimes: normalizePopularTimes(popularitySource),
    reviewTopics: normalizeReviewTopics(raw.reviewsTags),
  };
}

export function dinnerPopularityEffect(
  activity: Pick<VenueActivity, "popularTimes">,
  serviceDate: string,
): number | null {
  const date = new Date(`${serviceDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  const dinnerHours = new Set([17, 18, 19, 20, 21, 22]);
  const sampleFor = (day: PopularTimeDay) =>
    day.hours.filter((sample) => dinnerHours.has(sample.hour)).map((sample) => sample.popularity);
  const allValues = activity.popularTimes.flatMap(sampleFor);
  const selectedDay = activity.popularTimes.find((day) => day.day === weekday);
  const selectedValues = selectedDay ? sampleFor(selectedDay) : [];
  if (allValues.length === 0 || selectedValues.length === 0) return null;

  const baseline = allValues.reduce((sum, value) => sum + value, 0) / allValues.length;
  const dailyMean = selectedValues.reduce((sum, value) => sum + value, 0) / selectedValues.length;
  if (baseline <= 0) return null;
  const relativePercent = ((dailyMean - baseline) / baseline) * 100;
  return Math.max(-15, Math.min(15, Math.round(relativePercent * 10) / 10));
}

export function isSupportedGoogleMapsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_000) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const supportedHost =
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "goo.gl" ||
      host === "maps.app.goo.gl";
    return (
      url.protocol === "https:" &&
      supportedHost &&
      (host === "goo.gl" || host === "maps.app.goo.gl" || url.pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}
