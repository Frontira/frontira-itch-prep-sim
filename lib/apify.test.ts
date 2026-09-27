import assert from "node:assert/strict";
import test from "node:test";
import { dinnerPopularityEffect, normalizeVenueActivity } from "./apify.ts";

test("normalizes the Apify Google Places actor's location and identity fields", () => {
  const activity = normalizeVenueActivity(
    {
      title: "Sample Restaurant",
      categoryName: "Italian restaurant",
      address: "1 Market St, San Francisco, CA",
      menu: "https://example.com/menu",
      placeId: "ChIJ12345678901234567890123",
      location: { lat: 37.7936, lng: -122.3958 },
      totalScore: 4.6,
      reviewsCount: 208,
      popularTimesHistogram: {
        Mo: [{ hour: 18, occupancyPercent: 35 }],
        Tu: [{ hour: 18, occupancyPercent: 75 }],
      },
      scrapedAt: "2026-09-27T18:30:00.000Z",
    },
    undefined,
    "2026-09-27T18:31:00.000Z",
  );

  assert.ok(activity);
  assert.equal(activity.placeId, "ChIJ12345678901234567890123");
  assert.equal(activity.latitude, 37.7936);
  assert.equal(activity.longitude, -122.3958);
  assert.equal(activity.observedAt, "2026-09-27T18:30:00.000Z");
  assert.equal(activity.rating, 4.6);
  assert.equal(activity.reviewCount, 208);
  assert.equal(activity.category, "Italian restaurant");
  assert.equal(activity.menuUrl, "https://example.com/menu");
  assert.deepEqual(activity.popularTimes, [
    { day: "Monday", hours: [{ hour: 18, popularity: 35 }] },
    { day: "Tuesday", hours: [{ hour: 18, popularity: 75 }] },
  ]);
});

test("does not invent an identity when Apify returns none", () => {
  assert.equal(normalizeVenueActivity({ title: "Sample Restaurant" }), null);
});

test("weekday dinner popularity changes the cover prior with a strict bound", () => {
  const activity = {
    popularTimes: [
      { day: "Monday", hours: [{ hour: 18, popularity: 20 }] },
      { day: "Tuesday", hours: [{ hour: 18, popularity: 80 }] },
    ],
  };
  assert.equal(dinnerPopularityEffect(activity, "2026-09-28"), -15);
  assert.equal(dinnerPopularityEffect(activity, "2026-09-29"), 15);
  assert.equal(dinnerPopularityEffect(activity, "2026-09-30"), null);
});
