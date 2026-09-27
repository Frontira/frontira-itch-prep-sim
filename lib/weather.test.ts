import assert from "node:assert/strict";
import test from "node:test";
import { summarizeWeather } from "./weather.ts";

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
