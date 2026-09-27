import { NextResponse } from "next/server";
import { isSupportedGoogleMapsUrl, normalizeVenueActivity } from "@/lib/apify";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLACE_ID_PATTERN = /^(?:ChIJ|GhIJ)[A-Za-z0-9_-]{23}$/;
const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items";
const TIMEOUT_MS = 52_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Provide a placeId or Google Maps URL" }, { status: 400 });
  }
  const input = body as { placeId?: unknown; googleMapsUrl?: unknown };
  const placeId = typeof input.placeId === "string" ? input.placeId.trim() : "";
  const googleMapsUrl = input.googleMapsUrl;
  if (placeId && !PLACE_ID_PATTERN.test(placeId)) {
    return NextResponse.json({ error: "Unsupported Google Place ID format" }, { status: 400 });
  }
  if (googleMapsUrl !== undefined && !isSupportedGoogleMapsUrl(googleMapsUrl)) {
    return NextResponse.json(
      { error: "Provide a supported HTTPS Google Maps URL" },
      { status: 400 },
    );
  }
  if (!placeId && !googleMapsUrl) {
    return NextResponse.json({ error: "Provide a placeId or Google Maps URL" }, { status: 400 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Restaurant enrichment is not configured" }, { status: 503 });
  }

  const actorInput = googleMapsUrl
    ? {
        startUrls: [{ url: googleMapsUrl }],
        maxCrawledPlacesPerSearch: 1,
        scrapePlaceDetailPage: true,
        maxReviews: 0,
        language: "en",
      }
    : {
        placeIds: [placeId],
        maxCrawledPlacesPerSearch: 1,
        scrapePlaceDetailPage: true,
        maxReviews: 0,
        language: "en",
      };

  try {
    const response = await fetch(`${APIFY_ENDPOINT}?timeout=50&format=json&clean=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actorInput),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Restaurant data provider could not complete the request" },
        { status: 502 },
      );
    }
    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "No restaurant data was returned for this place" },
        { status: 404 },
      );
    }

    const matchingResult =
      (placeId &&
        results.find(
          (row) =>
            typeof row === "object" && row !== null && "placeId" in row && row.placeId === placeId,
        )) ||
      results[0];
    const activity = normalizeVenueActivity(matchingResult, placeId || undefined);
    if (!activity) {
      return NextResponse.json(
        { error: "Restaurant data did not include a usable place record" },
        { status: 502 },
      );
    }
    if (placeId && activity.placeId !== placeId) {
      return NextResponse.json(
        { error: "Returned place did not match the requested Place ID" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      activity,
      ...(activity.popularTimes.length === 0
        ? { activityError: "Google Maps did not provide popular-times data for this restaurant." }
        : {}),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "Restaurant data request timed out. Try again shortly."
          : "Restaurant data is temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
