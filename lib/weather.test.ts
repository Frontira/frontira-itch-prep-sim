import assert from "node:assert/strict";
import test from "node:test";
import { addDaysToIsoDate, summarizeWeather } from "./weather.ts";

test("builds consecutive service dates across month boundaries", () => {
  assert.equal(addDaysToIsoDate("2026-09-30", 1), "2026-10-01");
  assert.equal(addDaysToIsoDate("2026-12-31", 1), "2027-01-01");
});

test("summarizes the restaurant dinner window", () => {
  const times = Array.from(
    { length: 24 },
    (_, hour) => `2026-09-28T${String(hour).padStart(2, "0")}:00`,
  );
  const signal = summarizeWeather(
    {
      timezone: "America/Los_Angeles",
      hourly: {
        time: times,
        apparent_temperature: times.map((_, hour) => (hour >= 17 ? 54 : 64)),
        precipitation_probability: times.map((_, hour) => (hour >= 17 ? 75 : 10)),
        precipitation: times.map((_, hour) => (hour >= 17 ? 0.03 : 0)),
        wind_gusts_10m: times.map(() => 12),
      },
    },
    "2026-09-28",
  );
  assert.equal(signal.rainProbability, 75);
  assert.equal(signal.menuEffect, "cold-weather");
  assert.equal(signal.coverEffect, -7);
});
