import { expect, test } from "@playwright/test";

test("a real restaurant changes weather location and adds a bounded weekday prior", async ({
  page,
}) => {
  const placeId = "ChIJ12345678901234567890123";
  const weatherRequests: string[] = [];
  await page.route("**/api/signals/weather?**", async (route) => {
    weatherRequests.push(route.request().url());
    await route.fulfill({
      json: {
        source: "Open-Meteo",
        latitude: 37.7936,
        longitude: -122.3958,
        timezone: "America/Los_Angeles",
        days: ["2026-09-28", "2026-09-29", "2026-09-30"].map((serviceDate) => ({
          source: "Open-Meteo",
          observedAt: "2026-09-27T18:00:00.000Z",
          serviceDate,
          temperatureF: 60,
          rainProbability: 0,
          precipitationInches: 0,
          windGustMph: 8,
          coverEffect: -1,
          menuEffect: "neutral",
          confidence: 1,
        })),
      },
    });
  });
  await page.route("**/api/restaurants/search?**", async (route) => {
    await route.fulfill({
      json: {
        places: [
          {
            placeId,
            name: "Sample Restaurant",
            address: "1 Market St, San Francisco, CA",
            latitude: 37.7936,
            longitude: -122.3958,
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`,
            source: "Google Places",
          },
        ],
      },
    });
  });
  await page.route("**/api/restaurants/enrich", async (route) => {
    await route.fulfill({
      json: {
        activity: {
          source: "Apify Google Places",
          placeId,
          observedAt: "2026-09-27T18:30:00.000Z",
          title: "Sample Restaurant",
          address: "1 Market St, San Francisco, CA",
          latitude: 37.7936,
          longitude: -122.3958,
          popularTimes: [
            { day: "Monday", hours: [{ hour: 18, popularity: 20 }] },
            { day: "Tuesday", hours: [{ hour: 18, popularity: 80 }] },
            { day: "Wednesday", hours: [{ hour: 18, popularity: 50 }] },
          ],
          reviewTopics: [],
        },
      },
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Restaurant name and city").fill("Sample Restaurant SF");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  await page.getByRole("button", { name: /Sample Restaurant.*Use this restaurant/ }).click();
  await expect(page.getByText("Connected venue · Sample Restaurant")).toBeVisible();
  await expect(page.getByText("Venue-specific Trends needed")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Include Nearby event" })).toBeVisible();
  await expect
    .poll(() => weatherRequests.some((url) => url.includes("latitude=37.7936")))
    .toBe(true);

  await page.getByRole("button", { name: "Load Apify activity" }).click();
  await expect(page.getByText("Apify · weekday dinner pattern")).toBeVisible();
  await expect(page.getByText("Maps traffic prior -15%")).toBeVisible();
  await expect(page.getByText("Maps traffic prior +15%")).toBeVisible();
  await page.getByRole("button", { name: /Day 2 Tuesday/ }).click();
  await expect(page.getByText("What changes Tuesday, Sep 29?")).toBeVisible();
});
