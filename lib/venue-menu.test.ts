import assert from "node:assert/strict";
import test from "node:test";
import {
  JOHNS_GRILL_PLACE_ID,
  JOHNS_GRILL_SCENARIO_MENU,
  scenarioMenuForVenue,
} from "./venue-menu.ts";

test("John's Grill loads six published dinner dishes with editable scenario numbers", () => {
  const menu = scenarioMenuForVenue(JOHNS_GRILL_PLACE_ID);
  assert.ok(menu);
  assert.equal(menu.length, 6);
  assert.deepEqual(
    menu.map((item) => item.name),
    [
      "New York Steak",
      "Sam Spade’s Lamb Chops",
      "Ribeye Steak",
      "Filet Mignon",
      "Maine Lobster Ravioli",
      "New England Clam Chowder",
    ],
  );
  const firstDish = menu[0];
  assert.ok(firstDish);
  firstDish.orderShare = 0.99;
  assert.equal(JOHNS_GRILL_SCENARIO_MENU[0]?.orderShare, 0.18);
});

test("other venues do not inherit John's Grill dishes", () => {
  assert.equal(scenarioMenuForVenue("another-place"), null);
});
