export type RestaurantPlace = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
  website?: string;
  googleMapsUrl: string;
  source: "Google Places" | "Apify Google Places";
};

export type GooglePlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
  }>;
};

export function normalizeRestaurantPlaces(data: GooglePlacesSearchResponse): RestaurantPlace[] {
  return (data.places ?? [])
    .filter((place): place is typeof place & { id: string } => Boolean(place.id))
    .filter(
      (place): place is typeof place & { location: { latitude: number; longitude: number } } =>
        typeof place.location?.latitude === "number" &&
        typeof place.location?.longitude === "number",
    )
    .map((place) => ({
      placeId: place.id,
      name: place.displayName?.text?.trim() || "Unnamed restaurant",
      address: place.formattedAddress ?? "",
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      ...(typeof place.rating === "number" ? { rating: place.rating } : {}),
      ...(typeof place.userRatingCount === "number" ? { reviewCount: place.userRatingCount } : {}),
      ...(place.websiteUri ? { website: place.websiteUri } : {}),
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
      source: "Google Places",
    }));
}

type ApifyPlace = {
  placeId?: unknown;
  title?: unknown;
  address?: unknown;
  location?: { lat?: unknown; lng?: unknown };
  totalScore?: unknown;
  reviewsCount?: unknown;
  website?: unknown;
  permanentlyClosed?: unknown;
  temporarilyClosed?: unknown;
};

export function normalizeApifyRestaurantPlaces(data: unknown): RestaurantPlace[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const place = raw as ApifyPlace;
    if (place.permanentlyClosed === true || place.temporarilyClosed === true) return [];
    const id = typeof place.placeId === "string" ? place.placeId.trim() : "";
    const latitude = place.location?.lat;
    const longitude = place.location?.lng;
    if (
      !id ||
      seen.has(id) ||
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude)
    )
      return [];
    seen.add(id);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`;
    return [
      {
        placeId: id,
        name:
          typeof place.title === "string" && place.title.trim()
            ? place.title.trim()
            : "Unnamed restaurant",
        address: typeof place.address === "string" ? place.address : "",
        latitude,
        longitude,
        ...(typeof place.totalScore === "number" && Number.isFinite(place.totalScore)
          ? { rating: place.totalScore }
          : {}),
        ...(typeof place.reviewsCount === "number" && Number.isFinite(place.reviewsCount)
          ? { reviewCount: place.reviewsCount }
          : {}),
        ...(typeof place.website === "string" ? { website: place.website } : {}),
        googleMapsUrl: mapsUrl,
        source: "Apify Google Places" as const,
      },
    ];
  });
}
