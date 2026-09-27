import assert from "node:assert/strict";
import test from "node:test";
import { parseGoogleTrendsCsv } from "./trends.ts";

test("turns a Trends export into bounded momentum", () => {
  const csv = [
    "Category: All categories",
    "Week,pasta: (United States)",
    "2026-09-01,40",
    "2026-09-08,45",
    "2026-09-15,50",
    "2026-09-22,70",
  ].join("\n");
  const signal = parseGoogleTrendsCsv(csv, "Pasta");
  assert.equal(signal.observations, 4);
  assert.ok(signal.momentum > 0);
  assert.equal(signal.label, "Pasta");
});
