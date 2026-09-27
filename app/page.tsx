"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { type ScenarioInputs, simulatePrep } from "@/lib/simulation";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const initialInputs: ScenarioInputs = {
  covers: 128,
  weatherUplift: 8,
  eventUplift: 12,
  noShowRate: 6,
  safetyStock: 12,
  runs: 2_000,
  seed: 42,
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

export default function Home() {
  const [draft, setDraft] = useState(initialInputs);
  const [inputs, setInputs] = useState(initialInputs);
  const [decision, setDecision] = useState<{
    action: string;
    confidence: number;
    source: string;
  } | null>(null);
  const [summary, setSummary] = useState<{ summary: string; source: string } | null>(null);
  const [deciding, setDeciding] = useState(false);
  const result = useMemo(() => simulatePrep(inputs), [inputs]);
  const savings = Math.max(0, result.baselineWasteCost - result.projectedWasteCost);

  async function runScenario() {
    const nextInputs = { ...draft, seed: Date.now() };
    const nextResult = simulatePrep(nextInputs);
    setInputs(nextInputs);
    setDeciding(true);
    try {
      const [decisionResponse, summaryResponse] = await Promise.all([
        fetch("/api/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: nextInputs, result: nextResult }),
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
              <p className="font-grot text-sm font-semibold">Prep Decision Lab</p>
            </div>
          </div>
          <div className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-text-2">
            Challenge 04 · Live prototype
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-7 px-5 py-8 md:px-10 lg:grid-cols-[340px_1fr] lg:py-12">
        <aside className="space-y-6">
          <section>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[.22em] text-accent">
              Service assumptions
            </p>
            <h1 className="font-serif text-5xl leading-[.95] tracking-tight md:text-6xl">
              Prep for demand,
              <br />
              <em>not averages.</em>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-text-2">
              Simulate a dinner service thousands of times, then choose the prep plan that balances
              shortages against waste.
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
                label="Weather uplift"
                value={draft.weatherUplift}
                suffix="%"
                onChange={(weatherUplift) => setDraft({ ...draft, weatherUplift })}
              />
              <Field
                label="Event uplift"
                value={draft.eventUplift}
                suffix="%"
                onChange={(eventUplift) => setDraft({ ...draft, eventUplift })}
              />
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
            </div>
            <Button className="w-full" onClick={runScenario} disabled={deciding}>
              {deciding ? "Evaluating…" : "Run 2,000 scenarios"}
            </Button>
            <p data-ledger-message>Synthetic bistro data · ready for Adam&apos;s export</p>
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
              <article
                key={label}
                data-ledger-ui="card"
                data-ledger-card
                className="rounded-lg border border-line bg-bg-raised p-5"
              >
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
              <div className="flex gap-4 font-mono text-[10px] uppercase tracking-[.12em] text-text-2">
                <span>● Recommended</span>
                <span>○ Fixed par</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="font-mono text-[10px] uppercase tracking-[.14em] text-text-2">
                  <tr>
                    {[
                      "Item",
                      "Forecast",
                      "Prep",
                      "Fixed par",
                      "Shortage risk",
                      "Expected waste",
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
                    return (
                      <tr key={item.id} className="border-b border-line/70 last:border-0">
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
                        <td className="px-5 py-4">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${Math.min(100, item.shortageRisk * 4)}%` }}
                            />
                          </div>
                          <p className="mt-2 font-mono text-[10px] text-text-2">
                            {item.shortageRisk}%
                          </p>
                        </td>
                        <td className="px-5 py-4 font-mono text-sm">
                          {item.expectedWaste}{" "}
                          <span className="text-[10px] text-text-2">{item.unit}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <div className="grid gap-3 md:grid-cols-3">
            {["Demand signal", "Monte Carlo engine", "Jev decision layer"].map((title, index) => (
              <article key={title} className="rounded-lg border border-line p-4">
                <p className="font-mono text-[10px] text-text-2">0{index + 1}</p>
                <p className="mt-3 text-sm font-semibold">{title}</p>
                <p className="mt-2 text-xs leading-5 text-text-2">
                  {index === 0
                    ? "Bookings, weather, events and no-shows become a service distribution."
                    : index === 1
                      ? "Thousands of possible nights expose the real waste and shortage tradeoff."
                      : "Typed probabilities turn the simulation into a prep, hold or review action."}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
