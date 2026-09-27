import assert from "node:assert/strict";
import test from "node:test";
import { interpretDishAnswers } from "./dish-identification.ts";

const menu = [
  { id: "lamb-chops", name: "Sam Spade’s Lamb Chops" },
  { id: "clam-chowder", name: "New England Clam Chowder" },
];

test("Jev dish choices map only to menu items with sufficient confidence", () => {
  const matches = interpretDishAnswers(
    [
      { topic: "lamb chops", count: 70 },
      { topic: "live jazz", count: 24 },
      { topic: "seafood", count: 15 },
      { topic: "unknown", count: 3 },
    ],
    menu,
    {
      topic_0: { type: "choice", choice: "dish_0", confidence: 0.86 },
      topic_1: { type: "choice", choice: "not_dish", confidence: 0.96 },
      topic_2: { type: "choice", choice: "dish_1", confidence: 0.4 },
      topic_3: { type: "choice", choice: "dish_99", confidence: 0.99 },
    },
  );
  assert.deepEqual(
    matches.map(({ status, menuId }) => ({ status, menuId })),
    [
      { status: "matched", menuId: "lamb-chops" },
      { status: "not_dish", menuId: undefined },
      { status: "review", menuId: undefined },
      { status: "review", menuId: undefined },
    ],
  );
});
