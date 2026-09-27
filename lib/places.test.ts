import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApifyRestaurantPlaces, normalizeRestaurantPlaces } from "./places.ts";

test("normalizes Google Places search results for the restaurant picker", () => {
  const places = normalizeRestaurantPlaces({
    places: [
      {
        id: "ChIJ123",
        displayName: { text: "  Cafe Example  " },
        formattedAddress: "1 Market St, San Francisco, CA",
        location: { latitude: 37.79, longitude: -122.39 },
        rating: 4.6,
        userRatingCount: 123,
        websiteUri: "https://example.test",
      },
      { id: "missing-coordinates", displayName: { text: "Incomplete" } },
      { displayName: { text: "Missing stable id" }, location: { latitude: 1, longitude: 2 } },
    ],
  });

  assert.deepEqual(places, [
    {
      placeId: "ChIJ123",
      name: "Cafe Example",
      address: "1 Market St, San Francisco, CA",
      latitude: 37.79,
      longitude: -122.39,
      rating: 4.6,
      reviewCount: 123,
      website: "https://example.test",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query_place_id=ChIJ123",
      source: "Google Places",
    },
  ]);
});

test("normalizes bounded Apify search results without closed or duplicate places", () => {
  const places = normalizeApifyRestaurantPlaces([
    {
      placeId: "ChIJJQz5EZzKw4kRCZ95UajbyGw",
      title: " Kim's Island ",
      address: "Staten Island, NY",
      location: { lat: 40.51, lng: -74.25 },
      totalScore: 4.5,
      reviewsCount: 91,
    },
    { placeId: "ChIJJQz5EZzKw4kRCZ95UajbyGw", location: { lat: 40.51, lng: -74.25 } },
    { placeId: "closed", location: { lat: 40, lng: -74 }, permanentlyClosed: true },
    { placeId: "no-coordinates" },
  ]);
  assert.deepEqual(places, [
    {
      placeId: "ChIJJQz5EZzKw4kRCZ95UajbyGw",
      name: "Kim's Island",
      address: "Staten Island, NY",
      latitude: 40.51,
      longitude: -74.25,
      rating: 4.5,
      reviewCount: 91,
      googleMapsUrl:
        "https://www.google.com/maps/search/?api=1&query_place_id=ChIJJQz5EZzKw4kRCZ95UajbyGw",
      source: "Apify Google Places",
    },
  ]);
});
