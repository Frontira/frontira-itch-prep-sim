"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { JevDecision } from "@/lib/jev";
import { type ScenarioInputs, simulatePrep } from "@/lib/simulation";
import { parseGoogleTrendsCsv, type TrendsSignal } from "@/lib/trends";
import type { WeatherSignal } from "@/lib/weather";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const initialInputs: ScenarioInputs = {
  covers: 128,
  weatherUplift: 0,
  trendUplift: 0,
  eventUplift: 12,
  noShowRate: 6,
  safetyStock: 12,
  runs: 10_000,
  seed: 42,
};

const demoTrends: TrendsSignal = {
  source: "Google Trends CSV",
  label: "Demo pasta + bistro basket",
  observations: 28,
  recentIndex: 68,
  baselineIndex: 57,
  momentum: 19.3,
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
  children,
}: {
  title: string;
  source: string;
  value: string;
  detail: string;
  enabled: boolean;
  onToggle: () => void;
  tone?: "neutral" | "live" | "demo";
  children?: React.ReactNode;
}) {
  return (
    <article
      className={`rounded-lg border p-4 ${enabled ? "border-line bg-bg-raised" : "border-line/50 opacity-55"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-2">{title}</p>
          <p className="mt-1 text-xs text-text-2">{source}</p>
        </div>
        <button
          type="button"
          aria-pressed={enabled}
          onClick={onToggle}
          className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] ${
            enabled ? "border-accent/70 text-accent" : "border-line text-text-2"
          }`}
        >
          {enabled ? "Included" : "Excluded"}
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

export default function Home() {
  const [draft, setDraft] = useState(initialInputs);
  const [inputs, setInputs] = useState(initialInputs);
  const [weather, setWeather] = useState<WeatherSignal | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [trends, setTrends] = useState<TrendsSignal>(demoTrends);
  const [signals, setSignals] = useState({ weather: true, trends: true, events: true });
  const [decision, setDecision] = useState<JevDecision | null>(null);
  const [summary, setSummary] = useState<{ summary: string; source: string } | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [selectedItem, setSelectedItem] = useState("gnocchi");
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const result = useMemo(() => simulatePrep(inputs), [inputs]);
  const savings = Math.max(0, result.baselineWasteCost - result.projectedWasteCost);
  const selectedRecommendation =
    result.recommendations.find((item) => item.id === selectedItem) ?? result.recommendations[0];
  const selectedDecision = decision?.items.find((item) => item.id === selectedRecommendation?.id);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/signals/weather?latitude=37.7749&longitude=-122.4194", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return response.json() as Promise<WeatherSignal>;
      })
      .then((signal) => {
        setWeather(signal);
        setWeatherError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeatherError(true);
      });
    return () => controller.abort();
  }, []);

  function activeInputs(seed: number): ScenarioInputs {
    return {
      ...draft,
      weatherUplift: signals.weather ? (weather?.coverEffect ?? 0) : 0,
      trendUplift: signals.trends ? trends.momentum : 0,
      eventUplift: signals.events ? draft.eventUplift : 0,
      seed,
    };
  }

  async function runScenario() {
    const nextInputs = activeInputs(Date.now());
    const nextResult = simulatePrep(nextInputs);
    setInputs(nextInputs);
    setDeciding(true);
    try {
      const evidence = {
        inputs: nextInputs,
        signals: {
          weather: signals.weather ? weather : null,
          trends: signals.trends ? trends : null,
          event: signals.events
            ? { source: "Operator input", uplift: draft.eventUplift, confidence: 0.5 }
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
      setTrendsError(null);
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
              <p className="font-grot text-sm font-semibold">Tomorrow&apos;s Prep Briefing</p>
            </div>
          </div>
          <div className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-text-2">
            San Francisco · Dinner service
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
              Live signals reshape tonight&apos;s demand distribution. Ten thousand possible
              services expose the waste and shortage tradeoff before the first knife is lifted.
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
              onChange={(covers) => setDraft({ ...draft, covers })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="No-show rate"
                value={draft.noShowRate}
                suffix="%"
                onChange={(noShowRate) => setDraft({ ...draft, noShowRate })}
              />
              <Field
                label="Safety stock"
                value={draft.safetyStock}
                suffix="%"
                onChange={(safetyStock) => setDraft({ ...draft, safetyStock })}
              />
              <Field
                label="Event effect"
                value={draft.eventUplift}
                suffix="%"
                onChange={(eventUplift) => setDraft({ ...draft, eventUplift })}
              />
              <div data-ledger-field>
                <span data-ledger-label>Simulations</span>
                <div className="flex h-11 items-center rounded-md border border-input px-3 font-mono text-sm">
                  10,000
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={runScenario} disabled={deciding}>
              {deciding ? "Jev is evaluating…" : "Run evidence simulation"}
            </Button>
            <p data-ledger-message>Synthetic menu · ready for Adam&apos;s POS export</p>
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
          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
                  External signal board
                </p>
                <h2 className="mt-2 font-serif text-3xl">What changed tonight?</h2>
              </div>
              <p className="max-w-sm text-right text-xs leading-5 text-text-2">
                Toggle any source off, rerun, and see its counterfactual effect on the prep sheet.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <SignalCard
                title="Dinner weather"
                source={weatherError ? "Open-Meteo unavailable" : "Open-Meteo · live forecast"}
                value={weather ? `${weather.temperatureF}°F` : "Loading…"}
                detail={
                  weather
                    ? `${weather.rainProbability}% rain · ${weather.windGustMph} mph gusts · ${weather.coverEffect}% cover effect`
                    : "Fetching the 17:00–22:00 service window."
                }
                enabled={signals.weather}
                onToggle={() => setSignals({ ...signals, weather: !signals.weather })}
                tone={weather ? "live" : "neutral"}
              />
              <SignalCard
                title="Search momentum"
                source={trends.label}
                value={`${trends.momentum > 0 ? "+" : ""}${trends.momentum}%`}
                detail={`${trends.recentIndex} recent index vs ${trends.baselineIndex} baseline · ${trends.observations} observations`}
                enabled={signals.trends}
                onToggle={() => setSignals({ ...signals, trends: !signals.trends })}
                tone={trends.label.startsWith("Demo") ? "demo" : "live"}
              >
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 font-mono text-[9px] uppercase tracking-[.1em] text-accent">
                  Import Google Trends CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => importTrends(event.target.files?.[0])}
                  />
                </label>
                {trendsError ? <p className="mt-2 text-xs text-err">{trendsError}</p> : null}
              </SignalCard>
              <SignalCard
                title="Nearby event"
                source="Operator input · needs event feed"
                value={`+${draft.eventUplift}%`}
                detail="Dinner-period demand effect. Kept explicit until a venue source is connected."
                enabled={signals.events}
                onToggle={() => setSignals({ ...signals, events: !signals.events })}
                tone="demo"
              />
            </div>
          </div>

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
                "tonight's prep sheet",
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
                <h2 className="mt-2 font-serif text-3xl">Tonight&apos;s production plan</h2>
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
                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  {[
                    ["Booked demand", selectedRecommendation.contributions.bookedDemand],
                    ["Weather", selectedRecommendation.contributions.weather],
                    ["Search trends", selectedRecommendation.contributions.trends],
                    ["Events", selectedRecommendation.contributions.events],
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
