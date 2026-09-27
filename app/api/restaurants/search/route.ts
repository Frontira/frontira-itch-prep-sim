import { NextResponse } from "next/server";
import { type GooglePlacesSearchResponse, normalizeRestaurantPlaces } from "@/lib/places";

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim();
  if (!query || query.length < 2 || query.length > 200) {
    return NextResponse.json(
      { error: "Provide a restaurant search query between 2 and 200 characters." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Restaurant search is not configured." }, { status: 503 });
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query, pageSize: 5 }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Google Places could not complete the search." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as GooglePlacesSearchResponse;
    return NextResponse.json({ places: normalizeRestaurantPlaces(data) });
  } catch {
    return NextResponse.json(
      { error: "Restaurant search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
