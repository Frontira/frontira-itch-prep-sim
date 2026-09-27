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
  source: "Google Places";
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
