import assert from "node:assert/strict";
import test from "node:test";
import { simulatePrep } from "./simulation.ts";

test("returns deterministic recommendations for a fixed seed", () => {
  const inputs = {
    covers: 120,
    weatherUplift: 8,
    trendUplift: 12,
    eventUplift: 12,
    noShowRate: 5,
    safetyStock: 12,
    seed: 7,
  };
  assert.deepEqual(simulatePrep(inputs), simulatePrep(inputs));
});

test("higher demand raises total recommended prep", () => {
  const base = simulatePrep({
    covers: 90,
    weatherUplift: 0,
    trendUplift: 0,
    eventUplift: 0,
    noShowRate: 5,
    safetyStock: 10,
  });
  const busy = simulatePrep({
    covers: 160,
    weatherUplift: 10,
    trendUplift: 20,
    eventUplift: 15,
    noShowRate: 5,
    safetyStock: 10,
  });
  const total = (result: typeof base) =>
    result.recommendations.reduce((sum, item) => sum + item.recommendedPrep, 0);
  assert.ok(total(busy) > total(base));
});

test("always runs enough scenarios for a useful distribution", () => {
  const result = simulatePrep({
    covers: 100,
    weatherUplift: 0,
    trendUplift: 0,
    eventUplift: 0,
    noShowRate: 0,
    safetyStock: 10,
    runs: 12,
  });
  assert.equal(result.runs, 1_000);
  assert.equal(result.coverDistribution.bins.length, 14);
  assert.equal(
    result.coverDistribution.bins.reduce((sum, bin) => sum + bin.count, 0),
    result.runs,
  );
  assert.ok(result.coverDistribution.p10 <= result.coverDistribution.p50);
  assert.ok(result.coverDistribution.p50 <= result.coverDistribution.p90);
  assert.equal(
    result.recommendations[0]?.demandDistribution.bins.reduce((sum, bin) => sum + bin.count, 0),
    result.runs,
  );
});

test("external signals produce explainable item-level contributions", () => {
  const result = simulatePrep({
    covers: 100,
    weatherUplift: -8,
    trendUplift: 20,
    eventUplift: 10,
    noShowRate: 0,
    safetyStock: 10,
  });
  const gnocchi = result.recommendations.find((item) => item.id === "gnocchi");
  assert.ok(gnocchi);
  assert.ok(gnocchi.contributions.weather < 0);
  assert.ok(gnocchi.contributions.trends > 0);
  assert.ok(gnocchi.contributions.events > 0);
});

test("venue activity acts as a bounded cover prior with an explicit dish contribution", () => {
  const inputs = {
    covers: 100,
    weatherUplift: 0,
    trendUplift: 0,
    eventUplift: 0,
    noShowRate: 0,
    safetyStock: 10,
    seed: 11,
  };
  const baseline = simulatePrep(inputs);
  const venueBusy = simulatePrep({ ...inputs, venueUplift: 8 });
  const gnocchi = venueBusy.recommendations.find((item) => item.id === "gnocchi");
  assert.ok(venueBusy.effectiveCovers > baseline.effectiveCovers);
  assert.ok(gnocchi);
  assert.ok(gnocchi.contributions.venue > 0);
});

test("explicit waste versus sellout presets move every prep number in the expected direction", () => {
  const inputs = {
    covers: 128,
    weatherUplift: 0,
    trendUplift: 0,
    eventUplift: 0,
    noShowRate: 6,
    seed: 42,
  };
  const lean = simulatePrep({ ...inputs, safetyStock: -18 });
  const balanced = simulatePrep({ ...inputs, safetyStock: 0 });
  const cautious = simulatePrep({ ...inputs, safetyStock: 18 });
  for (let index = 0; index < lean.recommendations.length; index += 1) {
    const leanPrep = lean.recommendations[index]?.recommendedPrep ?? 0;
    const balancedPrep = balanced.recommendations[index]?.recommendedPrep ?? 0;
    const cautiousPrep = cautious.recommendations[index]?.recommendedPrep ?? 0;
    assert.ok(leanPrep <= balancedPrep);
    assert.ok(balancedPrep <= cautiousPrep);
  }
});
