import assert from "node:assert/strict";
import test from "node:test";
import { parseGoogleTrendsCsv } from "./trends.ts";

test("turns a Trends export into bounded momentum", () => {
  const csv = [
    "Category: All categories",
    "Week,pasta: (San Francisco-Oakland-San Jose CA),restaurant: (San Francisco-Oakland-San Jose CA)",
    "2026-09-01,40,60",
    "2026-09-08,45,65",
    "2026-09-15,50,70",
    "2026-09-22,70,90",
  ].join("\n");
  const signal = parseGoogleTrendsCsv(csv, "Pasta");
  assert.equal(signal.observations, 4);
  assert.ok(signal.momentum > 0);
  assert.equal(signal.label, "Pasta");
  assert.equal(signal.geography, "San Francisco-Oakland-San Jose CA");
  assert.deepEqual(signal.terms, ["pasta", "restaurant"]);
  assert.equal(signal.recentIndex, 80);
  assert.equal(signal.comparison, "1 recent point vs 3 earlier points");
});
