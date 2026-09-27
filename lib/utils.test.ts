import assert from "node:assert/strict";
import test from "node:test";
import { cn } from "./utils.ts";

/**
 * The seed test. It exists so this project has a real verification command from
 * its first commit, and so an agent asked to prove its work has somewhere
 * honest to point.
 *
 * `node --test` rather than a test framework: it needs no dependency, node 24
 * strips the types itself, and it runs in-process. That last one matters here.
 * Work is verified inside a sandbox that denies spawning helpers, which is what
 * makes `next build` and Playwright unusable as gates on a scaffolded project.
 *
 * Replace or extend this freely. What it should not become is a test that
 * asserts nothing: a suite reporting zero tests reads as a passing gate to
 * anything downstream that only checks an exit code.
 */
test("cn merges class names and lets the later one win", () => {
  assert.equal(cn("px-2", "py-1"), "px-2 py-1");
  // The reason tailwind-merge is here rather than plain clsx: a later utility
  // in the same group replaces the earlier one instead of both surviving.
  assert.equal(cn("px-2", "px-4"), "px-4");
});

test("cn drops falsy values instead of rendering them", () => {
  assert.equal(cn("px-2", false, null, undefined, ""), "px-2");
  assert.equal(cn("px-2", { hidden: false, block: true }), "px-2 block");
});
