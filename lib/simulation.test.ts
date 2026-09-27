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
