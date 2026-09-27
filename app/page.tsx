"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ControlGlyph } from "@/app/design-system/iconography";
import { Button } from "@/components/ui/button";
import { type SelectedVenue, VenueConnector } from "@/components/venue-connector";
import { dinnerPopularityEffect, type VenueActivity } from "@/lib/apify";
import type { JevDecision } from "@/lib/jev";
import {
  DEMO_MENU,
  type MenuItem,
  type PrepRecommendation,
  type ScenarioInputs,
  type SimulationResult,
  simulatePrep,
} from "@/lib/simulation";
import { parseGoogleTrendsCsv, type TrendsSignal } from "@/lib/trends";
import type { WeatherHorizon, WeatherSignal } from "@/lib/weather";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const EMPTY_WEATHER_HORIZON: Array<WeatherSignal | null> = [null, null, null];
const VENUE_STORAGE_KEY = "itch-prep-venue-v1";
const riskOptions = [
  { label: "Avoid waste", value: -18, detail: "Lean prep" },
  { label: "Balanced", value: 0, detail: "Middle ground" },
  { label: "Avoid sellouts", value: 18, detail: "Extra cover" },
] as const;
const serviceLocation = {
  label: "San Francisco city center",
  latitude: 37.7749,
  longitude: -122.4194,
  trendsGeography: "San Francisco-Oakland-San Jose CA",
  trendsUrl:
    "https://trends.google.com/trends/explore?date=today%203-m&geo=US-CA-807&q=pasta,restaurant,bistro",
};

const initialInputs: ScenarioInputs = {
  covers: 128,
  weatherUplift: 0,
  trendUplift: 0,
  eventUplift: 12,
  venueUplift: 0,
  noShowRate: 6,
  safetyStock: 0,
  runs: 10_000,
  seed: 42,
};

const localTrendsSnapshot: TrendsSignal = {
  source: "Google Trends CSV",
  label: "pasta + restaurant + bistro",
  geography: serviceLocation.trendsGeography,
  period: "2026-06-27 to 2026-09-27",
  comparison: "7 recent days vs 86 earlier days",
  terms: ["pasta", "restaurant", "bistro"],
  observations: 93,
  recentIndex: 25.3,
  baselineIndex: 29.1,
  momentum: -13.2,
  confidence: 1,
};

function Field({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div data-ledger-field>
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          data-ledger-ui="input"
          type="number"
          step="any"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="pr-12"
        />
        {suffix ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-text-2">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SignalCard({
  title,
  source,
  value,
  detail,
  enabled,
  onToggle,
  tone = "neutral",
  disabled = false,
  children,
}: {
  title: string;
  source: string;
  value: string;
  detail: string;
  enabled: boolean;
  onToggle: () => void;
  tone?: "neutral" | "live" | "demo";
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article
      className={`rounded-lg border p-4 transition-colors ${enabled ? "border-accent/55 bg-bg-raised" : "border-line/60 bg-bg-raised/40"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-2">{title}</p>
          <p className="mt-1 text-xs text-text-2">{source}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? "Exclude" : "Include"} ${title}`}
          onClick={onToggle}
          disabled={disabled}
          className={`flex min-h-10 min-w-[112px] shrink-0 items-center justify-between gap-2 rounded-md border px-2.5 py-2 font-mono text-[9px] uppercase tracking-[.08em] transition-colors ${
            enabled ? "border-ok/70 bg-ok-wash text-ok" : "border-line bg-bg text-text-2"
          }`}
        >
          <span
            aria-hidden="true"
            className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-ok" : "bg-line"}`}
          >
            <span
              className={`absolute top-1 size-3 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`}
            />
          </span>
          {enabled ? "On · used" : "Off"}
        </button>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="font-serif text-3xl">{value}</p>
        <span
          className={`mb-1 rounded-full px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] ${
            tone === "live"
              ? "bg-ok-wash text-ok"
              : tone === "demo"
                ? "bg-warn-wash text-warn"
                : "bg-info-wash text-info"
          }`}
        >
          {tone}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-text-2">{detail}</p>
      {children}
    </article>
  );
}

function ProbabilityBars({ probabilities }: { probabilities: Record<string, number> }) {
  return (
    <div className="mt-4 space-y-2">
      {Object.entries(probabilities)
        .sort(([, a], [, b]) => b - a)
        .map(([label, probability]) => (
          <div key={label} className="grid grid-cols-[68px_1fr_34px] items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[.08em] text-text-2">
              {label}
            </span>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent" style={{ width: `${probability * 100}%` }} />
            </div>
            <span className="text-right font-mono text-[9px] text-text-2">
              {Math.round(probability * 100)}%
            </span>
          </div>
        ))}
    </div>
  );
}

type HorizonPlan = {
  weather: WeatherSignal | null;
  venueEffect: number | null;
  inputs: ScenarioInputs;
  result: SimulationResult;
};

function formatServiceDate(date: string | undefined, index: number) {
  return date ? dayLabel.format(new Date(`${date}T12:00:00Z`)) : `Forecast day ${index + 1}`;
}

function WeatherIcon({ weather }: { weather: WeatherSignal | null }) {
  const label = weather
    ? `${weather.rainProbability}% rain probability, ${weather.temperatureF} degrees Fahrenheit`
    : "Weather forecast loading";
  return (
    <ControlGlyph
      name={weather && weather.rainProbability >= 40 ? "state.warning" : "state.info"}
      size={20}
      label={label}
    />
  );
}

function ThreeDayRunway({
  plans,
  selectedItem,
  selectedDay,
  hasVenueActivity,
  onSelect,
}: {
  plans: HorizonPlan[];
  selectedItem: string;
  selectedDay: number;
  hasVenueActivity: boolean;
  onSelect: (index: number) => void;
}) {
  const recommendations = plans.map(
    (plan) =>
      plan.result.recommendations.find((item) => item.id === selectedItem) ??
      plan.result.recommendations[0],
  );
  const domainMin = Math.min(...recommendations.map((item) => item?.demandDistribution.p10 ?? 0));
  const domainMax = Math.max(...recommendations.map((item) => item?.demandDistribution.p90 ?? 1));
  const domainSpan = Math.max(1, domainMax - domainMin);
  const position = (value: number) => ((value - domainMin) / domainSpan) * 100;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-ok">
            Three-morning order runway
          </p>
          <h2 className="mt-2 font-serif text-3xl">Order fresh for each service</h2>
        </div>
        <p className="max-w-md text-right text-xs leading-5 text-text-2">
          Assumes a fresh morning order, zero opening stock and no carryover. Select a day to
          inspect its full distribution.
        </p>
      </div>
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="sr-only">Three-day order forecast</legend>
        {plans.map((plan, index) => {
          const recommendation = recommendations[index];
          const distribution = recommendation?.demandDistribution;
          const isSelected = selectedDay === index;
          const rangeLeft = distribution ? position(distribution.p10) : 0;
          const rangeWidth = distribution ? Math.max(2, position(distribution.p90) - rangeLeft) : 0;
          return (
            <button
              key={plan.weather?.serviceDate ?? index}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(index)}
              className={`min-h-52 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-ok bg-ok-wash/40"
                  : "border-line bg-bg-raised hover:border-ok/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-ok">
                  <WeatherIcon weather={plan.weather} />
                  <span className="font-mono text-[10px] uppercase tracking-[.12em]">
                    {index === 0 ? "Tomorrow" : `Day ${index + 1}`}
                  </span>
                </div>
                <span
                  className={`size-2 rounded-full ${isSelected ? "bg-ok" : "bg-line"}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-sm font-semibold">
                {formatServiceDate(plan.weather?.serviceDate, index)}
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[.1em] text-text-2">
                    Morning order · {recommendation?.name}
                  </p>
                  <p className="mt-1 font-serif text-4xl">
                    {recommendation?.recommendedPrep ?? "—"}
                    <span className="ml-2 font-grot text-xs text-text-2">
                      {recommendation?.unit}
                    </span>
                  </p>
                </div>
                <p className="text-right font-mono text-[10px] text-text-2">
                  <span className="text-text">
                    {number.format(plan.result.effectiveCovers)} covers
                  </span>
                  <br />
                  {plan.weather
                    ? `${plan.weather.temperatureF}°F · ${plan.weather.rainProbability}% rain`
                    : "Loading forecast"}
                </p>
              </div>
              <div className="mt-5">
                <div className="relative h-2 rounded-full bg-line/70">
                  {distribution ? (
                    <>
                      <span
                        className="absolute inset-y-0 rounded-full bg-ok/55"
                        style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%` }}
                      />
                      <span
                        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ok bg-bg"
                        style={{ left: `${position(distribution.p50)}%` }}
                      />
                    </>
                  ) : null}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[9px] text-text-2">
                  <span>P10 {distribution?.p10 ?? "—"}</span>
                  <span>Median {distribution?.p50 ?? "—"}</span>
                  <span>P90 {distribution?.p90 ?? "—"}</span>
                </div>
                {hasVenueActivity ? (
                  <p className="mt-2 font-mono text-[9px] text-ok">
                    {plan.venueEffect === null
                      ? "No Maps dinner sample"
                      : `Maps traffic prior ${plan.venueEffect > 0 ? "+" : ""}${plan.venueEffect}%`}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}

function DemandDistribution({
  result,
  recommendation,
}: {
  result: SimulationResult;
  recommendation: PrepRecommendation;
}) {
  const { bins, min, max, p10, p50, p90 } = recommendation.demandDistribution;
  const peak = Math.max(...bins.map((bin) => bin.count));
  const position = (value: number) => `${((value - min) / Math.max(1, max - min)) * 100}%`;

  return (
    <article className="rounded-lg border border-line bg-bg-raised p-5" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-ok" aria-hidden="true" />
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-ok">
              Live scenario preview
            </p>
          </div>
          <h2 className="mt-2 font-serif text-3xl">
            Where {recommendation.name.toLowerCase()} demand may land
          </h2>
        </div>
        <p className="max-w-sm text-right text-xs leading-5 text-text-2">
          {result.runs.toLocaleString()} simulated services recalculate as assumptions or sources
          change.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <div
            className="relative h-40 border-b border-line"
            role="img"
            aria-label={`Distribution of simulated ${recommendation.unit} of ${recommendation.name} from ${min} to ${max}. Ten percent of services are below ${p10}, the median is ${p50}, and ninety percent are below ${p90}.`}
          >
            <div className="absolute inset-0 flex items-end gap-1 px-1">
              {bins.map((bin) => (
                <div
                  key={bin.from}
                  className="min-w-0 flex-1 rounded-t-sm bg-ok/65 transition-[height] duration-300"
                  style={{ height: `${Math.max(3, (bin.count / peak) * 100)}%` }}
                  title={`${bin.from}–${bin.to} ${recommendation.unit}: ${bin.count.toLocaleString()} runs`}
                />
              ))}
            </div>
            <div
              className="absolute inset-y-0 border-l border-dashed border-text-2/55"
              style={{ left: position(p10) }}
            />
            <div
              className="absolute inset-y-0 border-l-2 border-ok"
              style={{ left: position(p50) }}
            />
            <div
              className="absolute inset-y-0 border-l border-dashed border-text-2/55"
              style={{ left: position(p90) }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] text-text-2">
            <span>
              {min} {recommendation.unit}
            </span>
            <span>
              {max} {recommendation.unit}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
          {[
            ["P10", p10],
            ["Median", p50],
            ["P90", p90],
          ].map(([label, value]) => (
            <div key={label} className="min-w-20 border-l border-line pl-3">
              <p className="font-mono text-[9px] uppercase tracking-[.12em] text-text-2">{label}</p>
              <p className="mt-1 font-serif text-2xl">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [draft, setDraft] = useState(initialInputs);
  const [venue, setVenue] = useState<SelectedVenue | null>(null);
  const [activity, setActivity] = useState<VenueActivity | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>(DEMO_MENU);
  const [venueRestored, setVenueRestored] = useState(false);
  const [weatherHorizon, setWeatherHorizon] = useState<WeatherSignal[]>([]);
  const [weatherError, setWeatherError] = useState(false);
  const [trends, setTrends] = useState<TrendsSignal>(localTrendsSnapshot);
  const [trendsScope, setTrendsScope] = useState<"demo" | "venue">("demo");
  const [signals, setSignals] = useState({
    weather: true,
    trends: true,
    events: true,
    venue: false,
  });
  const [decision, setDecision] = useState<JevDecision | null>(null);
  const [summary, setSummary] = useState<{ summary: string; source: string } | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedItem, setSelectedItem] = useState("gnocchi");
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const activeLatitude = venue?.latitude ?? serviceLocation.latitude;
  const activeLongitude = venue?.longitude ?? serviceLocation.longitude;
  const trendsReady = !venue || trendsScope === "venue";
  const horizonWeather = weatherHorizon.length > 0 ? weatherHorizon : EMPTY_WEATHER_HORIZON;
  const horizonPlans = useMemo(
    () =>
      horizonWeather.map((weather, index) => {
        const venueEffect =
          venue && activity && weather
            ? dinnerPopularityEffect(activity, weather.serviceDate)
            : null;
        const inputs: ScenarioInputs = {
          ...draft,
          weatherUplift: signals.weather ? (weather?.coverEffect ?? 0) : 0,
          trendUplift: signals.trends && trendsReady ? trends.momentum : 0,
          eventUplift: signals.events ? draft.eventUplift : 0,
          venueUplift: signals.venue ? (venueEffect ?? 0) : 0,
          seed: 42 + index,
        };
        return { weather, venueEffect, inputs, result: simulatePrep(inputs, menu) };
      }),
    [draft, horizonWeather, signals, trends.momentum, trendsReady, venue, activity, menu],
  );
  const selectedPlan = horizonPlans[selectedDay] ?? horizonPlans[0];
  const weather = selectedPlan?.weather ?? null;
  const result = selectedPlan?.result ?? simulatePrep(initialInputs, menu);
  const selectedDateLabel = formatServiceDate(weather?.serviceDate, selectedDay);
  const selectedVenueEffect = selectedPlan?.venueEffect ?? null;
  const savings = Math.max(0, result.baselineWasteCost - result.projectedWasteCost);
  const selectedRecommendation =
    result.recommendations.find((item) => item.id === selectedItem) ?? result.recommendations[0];
  const selectedDecision = decision?.items.find((item) => item.id === selectedRecommendation?.id);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VENUE_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && "venue" in parsed) {
          const record = parsed as {
            venue?: SelectedVenue;
            activity?: VenueActivity;
            menu?: MenuItem[];
          };
          if (
            record.venue &&
            typeof record.venue.placeId === "string" &&
            Number.isFinite(record.venue.latitude) &&
            Number.isFinite(record.venue.longitude)
          ) {
            setVenue(record.venue);
            if (
              Array.isArray(record.menu) &&
              record.menu.length === DEMO_MENU.length &&
              record.menu.every(
                (item, index) =>
                  item?.id === DEMO_MENU[index]?.id &&
                  typeof item.name === "string" &&
                  Number.isFinite(item.orderShare) &&
                  Number.isFinite(item.baselinePar) &&
                  Number.isFinite(item.unitCost),
              )
            )
              setMenu(record.menu);
            const savedActivity = record.activity;
            if (savedActivity && Array.isArray(savedActivity.popularTimes)) {
              setActivity({
                ...savedActivity,
                openingHours: Array.isArray(savedActivity.openingHours)
                  ? savedActivity.openingHours
                  : [],
                reviewTopics: Array.isArray(savedActivity.reviewTopics)
                  ? savedActivity.reviewTopics
                  : [],
              });
              setSignals((current) => ({
                ...current,
                trends: false,
                events: false,
                venue: savedActivity.popularTimes.length > 0,
              }));
            } else {
              setSignals((current) => ({ ...current, trends: false, events: false }));
            }
          }
        }
      }
    } catch {
      // A malformed or blocked browser cache must never prevent the demo from opening.
    }
    setVenueRestored(true);
  }, []);

  useEffect(() => {
    if (!venueRestored) return;
    try {
      if (venue)
        window.localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify({ venue, activity, menu }));
      else window.localStorage.removeItem(VENUE_STORAGE_KEY);
    } catch {
      // The connection still works when private browsing disallows local storage.
    }
  }, [venue, activity, menu, venueRestored]);

  useEffect(() => {
    const controller = new AbortController();
    setWeatherHorizon([]);
    setWeatherError(false);
    fetch(`/api/signals/weather?latitude=${activeLatitude}&longitude=${activeLongitude}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return response.json() as Promise<WeatherHorizon>;
      })
      .then((horizon) => {
        setWeatherHorizon(horizon.days);
        setWeatherError(false);
        setDecision(null);
        setSummary(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeatherError(true);
      });
    return () => controller.abort();
  }, [activeLatitude, activeLongitude]);

  function selectVenue(next: SelectedVenue | null) {
    const samePlace = Boolean(venue && next && venue.placeId === next.placeId);
    setVenue(next);
    if (!samePlace) {
      setMenu(DEMO_MENU);
      setSelectedItem("gnocchi");
      setTrendsScope("demo");
      setSignals((current) => ({
        ...current,
        trends: !next,
        events: !next,
        venue: false,
      }));
    }
    setDecision(null);
    setSummary(null);
  }

  function updateActivity(next: VenueActivity | null) {
    setActivity(next);
    setSignals((current) => ({ ...current, venue: Boolean(next?.popularTimes.length) }));
    setDecision(null);
    setSummary(null);
  }

  function updateDraft(next: ScenarioInputs) {
    setDraft(next);
    setDecision(null);
    setSummary(null);
  }

  function updateMenuItem(id: string, changes: Partial<MenuItem>) {
    setMenu((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    setDecision(null);
    setSummary(null);
  }

  function updateSignals(next: typeof signals) {
    setSignals(next);
    setDecision(null);
    setSummary(null);
  }

  function selectDay(index: number) {
    setSelectedDay(index);
    setDecision(null);
    setSummary(null);
  }

  async function runScenario() {
    const nextInputs = selectedPlan?.inputs ?? initialInputs;
    const nextResult = simulatePrep(nextInputs, menu);
    setDeciding(true);
    try {
      const evidence = {
        inputs: nextInputs,
        signals: {
          weather: signals.weather ? weather : null,
          trends: signals.trends && trendsReady ? trends : null,
          event: signals.events
            ? { source: "Operator input", uplift: draft.eventUplift, confidence: 0.5 }
            : null,
          venue:
            signals.venue && venue && activity && selectedVenueEffect !== null
              ? {
                  source: activity.source,
                  placeId: venue.placeId,
                  observedAt: activity.observedAt,
                  dinnerPopularityEffect: selectedVenueEffect,
                  confidence: 0.25,
                }
              : null,
        },
        result: nextResult,
      };
      const [decisionResponse, summaryResponse] = await Promise.all([
        fetch("/api/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(evidence),
        }),
        fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextResult),
        }),
      ]);
      setDecision(await decisionResponse.json());
      setSummary(await summaryResponse.json());
    } finally {
      setDeciding(false);
    }
  }

  async function importTrends(file: File | undefined) {
    if (!file) return;
    try {
      const signal = parseGoogleTrendsCsv(await file.text(), file.name.replace(/\.csv$/i, ""));
      setTrends(signal);
      setTrendsScope(venue ? "venue" : "demo");
      setSignals((current) => ({ ...current, trends: true }));
      setTrendsError(null);
      setDecision(null);
      setSummary(null);
    } catch (error) {
      setTrendsError(error instanceof Error ? error.message : "Could not parse Trends CSV");
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <header className="border-b border-line px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-accent font-serif text-xl text-white">
              F
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-text-2">
                Frontira × ITCHATHON
              </p>
              <p className="font-grot text-sm font-semibold">Three-Day Morning Briefing</p>
            </div>
          </div>
          <div className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-text-2">
            {venue
              ? `Connected venue · ${venue.name}`
              : "Demo location · San Francisco city center"}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-7 px-5 py-8 md:px-10 lg:grid-cols-[340px_1fr] lg:py-12">
        <aside className="space-y-6">
          <section>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[.22em] text-accent">
              Evidence-led preparation
            </p>
            <h1 className="font-serif text-5xl leading-[.95] tracking-tight md:text-6xl">
              Prep for demand,
              <br />
              <em>not averages.</em>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-text-2">
              Order fresh each morning with a three-service view. Ten thousand possible outcomes
              expose the waste and shortage tradeoff before the first knife is lifted.
            </p>
          </section>

          <section
            data-ledger-ui="card"
            data-ledger-card
            className="space-y-4 rounded-lg border border-line bg-bg-raised p-5"
          >
            <Field
              label="Booked covers"
              value={draft.covers}
              onChange={(covers) => updateDraft({ ...draft, covers })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="No-show rate"
                value={draft.noShowRate}
                suffix="%"
                onChange={(noShowRate) => updateDraft({ ...draft, noShowRate })}
              />
              <Field
                label="Event effect"
                value={draft.eventUplift}
                suffix="%"
                onChange={(eventUplift) => updateDraft({ ...draft, eventUplift })}
              />
              <div data-ledger-field>
                <span data-ledger-label>Simulations</span>
                <div className="flex h-11 items-center rounded-md border border-input px-3 font-mono text-sm">
                  10,000
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={runScenario} disabled={deciding}>
              {deciding ? "Jev is evaluating…" : "Evaluate selected day with Jev"}
            </Button>
            <p data-ledger-message>
              Daily replenishment · zero carryover · synthetic menu and booked covers
            </p>
          </section>

          {decision ? (
            <section className="rounded-lg border border-accent/50 bg-accent/10 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-text-2">
                Decision layer · {decision.source}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <p className="font-serif text-3xl capitalize">{decision.action}</p>
                <p className="font-mono text-xs text-text-2">
                  {Math.round(decision.confidence * 100)}% confidence
                </p>
              </div>
              <ProbabilityBars probabilities={decision.probabilities} />
              <p className="mt-4 border-t border-line/60 pt-3 font-mono text-[9px] uppercase tracking-[.12em] text-text-2">
                Signal quality {number.format(decision.signalConfidence)}/3 · shortage risk{" "}
                {number.format(decision.shortageRiskScore)}/3
              </p>
            </section>
          ) : null}

          {summary ? (
            <section className="rounded-lg border border-line p-5">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-text-2">
                Chef note · {summary.source}
              </p>
              <p className="mt-3 text-sm leading-6">{summary.summary}</p>
            </section>
          ) : null}
        </aside>

        <section className="space-y-5">
          <VenueConnector
            venue={venue}
            activity={activity}
            selectedDishName={selectedRecommendation?.name ?? "selected dish"}
            onVenueChange={selectVenue}
            onActivityChange={updateActivity}
            onUseReviewTopic={(topic) => updateMenuItem(selectedItem, { name: topic })}
          />
          <section
            data-testid="morning-card"
            className="rounded-lg border border-accent/60 bg-accent/8 p-5"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  One-minute morning answer
                </p>
                <h2 className="mt-2 font-serif text-3xl">
                  {selectedDateLabel} · prep these quantities
                </h2>
                <p className="mt-2 text-xs text-text-2">
                  {venue ? `${venue.name} · real venue context` : "San Francisco demo venue"} ·{" "}
                  {number.format(result.effectiveCovers)} expected covers
                </p>
              </div>
              <span className="rounded-full border border-warn/60 bg-warn-wash px-3 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-warn">
                Illustrative demand, not POS history
              </span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {result.recommendations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item.id)}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors ${selectedItem === item.id ? "border-accent bg-bg-raised" : "border-line bg-bg-raised/50 hover:border-accent/60"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="block font-mono text-[9px] uppercase tracking-[.1em] text-text-2">
                      {item.recommendedPrep - item.baselinePar >= 0 ? "+" : ""}
                      {item.recommendedPrep - item.baselinePar} vs current par
                    </span>
                  </span>
                  <span className="shrink-0 font-serif text-3xl">{item.recommendedPrep}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line/70 pt-4">
              <p className="mr-2 font-mono text-[10px] uppercase tracking-[.12em] text-text-2">
                Which mistake hurts more?
              </p>
              {riskOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={draft.safetyStock === option.value}
                  data-testid={`risk-${option.value}`}
                  onClick={() => updateDraft({ ...draft, safetyStock: option.value })}
                  className={`rounded-md border px-3 py-2 text-xs ${draft.safetyStock === option.value ? "border-ok bg-ok-wash text-ok" : "border-line text-text-2 hover:border-ok/60"}`}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="ml-2 opacity-70">{option.detail}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-2">
              This choice shifts the simulation target from lean to cautious prep. Tap any quantity
              for its uncertainty and source breakdown below.
            </p>
          </section>
          {selectedRecommendation ? (
            <section className="rounded-lg border border-line bg-bg-raised p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">
                    Operator calibration
                  </p>
                  <h2 className="mt-1 font-serif text-2xl">Make the prep sheet yours</h2>
                </div>
                <p className="max-w-sm text-xs text-text-2">
                  Select a prep row, then use a guest-mentioned dish or enter your own. Shares,
                  costs and pars are assumptions until the operator confirms them.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div data-ledger-field>
                  <label htmlFor="selected-dish-name">Selected dish</label>
                  <input
                    id="selected-dish-name"
                    data-ledger-ui="input"
                    value={selectedRecommendation.name}
                    maxLength={80}
                    onChange={(event) => updateMenuItem(selectedItem, { name: event.target.value })}
                  />
                </div>
                <Field
                  label="Orders per 100 covers"
                  value={Math.round(selectedRecommendation.orderShare * 100)}
                  suffix="%"
                  onChange={(value) =>
                    updateMenuItem(selectedItem, {
                      orderShare: Math.max(0, Math.min(1, value / 100)),
                    })
                  }
                />
                <Field
                  label="Current par"
                  value={selectedRecommendation.baselinePar}
                  onChange={(value) =>
                    updateMenuItem(selectedItem, { baselinePar: Math.max(0, Math.round(value)) })
                  }
                />
                <Field
                  label="Waste cost per portion"
                  value={selectedRecommendation.unitCost}
                  suffix="$"
                  onChange={(value) =>
                    updateMenuItem(selectedItem, { unitCost: Math.max(0, value) })
                  }
                />
              </div>
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[.1em] text-text-2">
                Apify names and context · operator-entered economics · simulated quantities
              </p>
            </section>
          ) : null}
          <ThreeDayRunway
            plans={horizonPlans}
            selectedItem={selectedItem}
            selectedDay={selectedDay}
            hasVenueActivity={Boolean(venue && activity && signals.venue)}
            onSelect={selectDay}
          />

          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
                  External signal board
                </p>
                <h2 className="mt-2 font-serif text-3xl">What changes {selectedDateLabel}?</h2>
              </div>
              <p className="max-w-sm text-right text-xs leading-5 text-text-2">
                Toggle any source off and see its counterfactual effect immediately.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <SignalCard
                title="Dinner weather"
                source={weatherError ? "Open-Meteo unavailable" : "Open-Meteo · live forecast"}
                value={weather ? `${weather.temperatureF}°F` : "Loading…"}
                detail={
                  weather
                    ? `${weather.rainProbability}% rain · ${weather.windGustMph} mph gusts · ${weather.coverEffect}% cover effect · ${activeLatitude}, ${activeLongitude}`
                    : "Fetching three 17:00–22:00 service windows."
                }
                enabled={signals.weather}
                onToggle={() => updateSignals({ ...signals, weather: !signals.weather })}
                tone={weather ? "live" : "neutral"}
              />
              <SignalCard
                title="Search momentum"
                source={
                  trendsReady
                    ? "Google Trends · local DMA snapshot"
                    : "Venue-specific Trends needed"
                }
                value={trendsReady ? `${trends.momentum > 0 ? "+" : ""}${trends.momentum}%` : "—"}
                detail={
                  trendsReady
                    ? `${trends.geography} · ${trends.recentIndex} recent index vs ${trends.baselineIndex} baseline · ${trends.observations} observations`
                    : "The San Francisco demo snapshot is excluded. Import a local CSV for this venue."
                }
                enabled={signals.trends && trendsReady}
                onToggle={() => updateSignals({ ...signals, trends: !signals.trends })}
                disabled={!trendsReady}
                tone={trendsReady ? "live" : "neutral"}
              >
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/60 pt-3 font-mono text-[9px] uppercase tracking-[.1em]">
                  {!venue ? (
                    <a
                      href={serviceLocation.trendsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ok underline-offset-4 hover:underline"
                    >
                      View local evidence
                    </a>
                  ) : null}
                  <label className="cursor-pointer text-ok underline-offset-4 hover:underline">
                    Import updated CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={(event) => importTrends(event.target.files?.[0])}
                    />
                  </label>
                </div>
                {trendsReady ? (
                  <p className="mt-2 font-mono text-[9px] text-text-2">
                    {trends.label} · {trends.comparison} · {trends.period}
                  </p>
                ) : null}
                {trendsError ? <p className="mt-2 text-xs text-err">{trendsError}</p> : null}
              </SignalCard>
              <SignalCard
                title="Nearby event"
                source="Operator input · needs event feed"
                value={`+${draft.eventUplift}%`}
                detail="Dinner-period demand effect. Kept explicit until a venue source is connected."
                enabled={signals.events}
                onToggle={() => updateSignals({ ...signals, events: !signals.events })}
                tone="demo"
              />
              <SignalCard
                title="Venue activity"
                source={
                  activity ? "Apify · Google Maps popular times" : "Connect a restaurant above"
                }
                value={
                  activity && venue && weather
                    ? selectedVenueEffect === null
                      ? "No data"
                      : `${selectedVenueEffect > 0 ? "+" : ""}${selectedVenueEffect}%`
                    : "—"
                }
                detail={
                  activity && venue && weather
                    ? selectedVenueEffect === null
                      ? "No dinner-hours popularity sample for this weekday; this source is excluded."
                      : "Dinner traffic relative to this venue's weekly pattern. Bounded to ±15% as a weak cover prior."
                    : "Load a real venue's Maps activity to compare each service day."
                }
                enabled={signals.venue && selectedVenueEffect !== null}
                onToggle={() => updateSignals({ ...signals, venue: !signals.venue })}
                disabled={!activity?.popularTimes.length || !venue || selectedVenueEffect === null}
                tone={activity && venue && selectedVenueEffect !== null ? "live" : "neutral"}
              />
            </div>
          </div>

          {selectedRecommendation ? (
            <DemandDistribution result={result} recommendation={selectedRecommendation} />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Expected covers",
                number.format(result.effectiveCovers),
                `${result.runs.toLocaleString()} runs`,
              ],
              [
                "Waste exposure",
                money.format(result.projectedWasteCost),
                `${money.format(savings)} below fixed par`,
              ],
              [
                "Shortage risk",
                `${result.averageShortageRisk}%`,
                `${result.baselineShortageRisk}% fixed-par baseline`,
              ],
              [
                "Items adjusted",
                `${result.recommendations.filter((item) => item.recommendedPrep !== item.baselinePar).length}/${result.recommendations.length}`,
                `${selectedDateLabel} prep sheet`,
              ],
            ].map(([label, value, note]) => (
              <article key={label} className="rounded-lg border border-line bg-bg-raised p-5">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-2">
                  {label}
                </p>
                <p className="mt-4 font-serif text-4xl">{value}</p>
                <p className="mt-2 text-xs text-text-2">{note}</p>
              </article>
            ))}
          </div>

          <article className="overflow-hidden rounded-lg border border-line bg-bg-raised">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line p-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
                  Recommended prep sheet
                </p>
                <h2 className="mt-2 font-serif text-3xl">{selectedDateLabel} production plan</h2>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[.12em] text-text-2">
                Select a dish to explain its forecast
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="font-mono text-[10px] uppercase tracking-[.14em] text-text-2">
                  <tr>
                    {[
                      "Item",
                      "Forecast",
                      "Prep",
                      "Fixed par",
                      "Shortage",
                      "Waste",
                      "Jev action",
                    ].map((heading) => (
                      <th key={heading} className="border-b border-line px-5 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((item) => {
                    const delta = item.recommendedPrep - item.baselinePar;
                    const itemDecision = decision?.items.find(
                      (candidate) => candidate.id === item.id,
                    );
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item.id)}
                        className={`cursor-pointer border-b border-line/70 last:border-0 ${selectedItem === item.id ? "bg-accent/8" : "hover:bg-white/[.025]"}`}
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[.12em] text-text-2">
                            {item.station}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-mono text-sm">{item.expectedDemand}</td>
                        <td className="px-5 py-4">
                          <span className="font-serif text-2xl">{item.recommendedPrep}</span>
                          <span
                            className={`ml-2 font-mono text-[10px] ${delta > 0 ? "text-warn" : "text-ok"}`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-sm text-text-2">
                          {item.baselinePar}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">{item.shortageRisk}%</td>
                        <td className="px-5 py-4 font-mono text-xs">
                          {item.expectedWaste} {item.unit}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em]">
                            {itemDecision?.action ?? "pending"}
                          </span>
                          {itemDecision ? (
                            <p className="mt-2 font-mono text-[9px] text-text-2">
                              {Math.round(itemDecision.confidence * 100)}% confidence
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          {selectedRecommendation ? (
            <article className="grid gap-6 rounded-lg border border-line p-5 lg:grid-cols-[1fr_320px]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
                  Why this quantity?
                </p>
                <h3 className="mt-2 font-serif text-3xl">{selectedRecommendation.name}</h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    ["Booked demand", selectedRecommendation.contributions.bookedDemand],
                    ["Weather", selectedRecommendation.contributions.weather],
                    ["Search trends", selectedRecommendation.contributions.trends],
                    ["Events", selectedRecommendation.contributions.events],
                    ["Venue", selectedRecommendation.contributions.venue],
                  ].map(([label, contribution]) => (
                    <div key={String(label)} className="rounded-md border border-line p-3">
                      <p className="font-mono text-[9px] uppercase tracking-[.12em] text-text-2">
                        {label}
                      </p>
                      <p
                        className={`mt-3 font-serif text-2xl ${Number(contribution) < 0 ? "text-err" : Number(contribution) > 0 ? "text-ok" : ""}`}
                      >
                        {label === "Booked demand" ? "" : Number(contribution) > 0 ? "+" : ""}
                        {number.format(Number(contribution))}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-text-2">
                  External contributions are bounded by dish-specific sensitivities. They can be
                  removed individually and recalculated as counterfactuals.
                </p>
              </div>
              <div className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-2">
                  Jev dish decision
                </p>
                <p className="mt-3 font-serif text-3xl capitalize">
                  {selectedDecision?.action ?? "Run simulation"}
                </p>
                {selectedDecision ? (
                  <ProbabilityBars probabilities={selectedDecision.probabilities} />
                ) : (
                  <p className="mt-3 text-xs text-text-2">
                    Jev evaluates every dish in one typed batch after the simulation.
                  </p>
                )}
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
