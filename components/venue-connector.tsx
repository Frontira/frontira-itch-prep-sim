"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { VenueActivity } from "@/lib/apify";
import type { RestaurantPlace } from "@/lib/places";

export type SelectedVenue = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  source: "Google Places" | "Apify Google Places";
  rating?: number;
  reviewCount?: number;
};

type Props = {
  venue: SelectedVenue | null;
  activity: VenueActivity | null;
  selectedDishName: string;
  onVenueChange: (venue: SelectedVenue | null) => void;
  onActivityChange: (activity: VenueActivity | null) => void;
  onUseReviewTopic: (topic: string) => void;
};

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dinnerMean(activity: VenueActivity, day: string) {
  const samples = activity.popularTimes
    .find((entry) => entry.day === day)
    ?.hours.filter((entry) => entry.hour >= 17 && entry.hour <= 22)
    .map((entry) => entry.popularity);
  return samples?.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : null;
}

export function VenueConnector({
  venue,
  activity,
  selectedDishName,
  onVenueChange,
  onActivityChange,
  onUseReviewTopic,
}: Props) {
  const [query, setQuery] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [matches, setMatches] = useState<RestaurantPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const daily = activity ? weekdays.map((day) => ({ day, value: dinnerMean(activity, day) })) : [];
  const activityAgeDays = activity
    ? Math.floor((Date.now() - Date.parse(activity.observedAt)) / 86_400_000)
    : 0;

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setMessage(null);
    setMatches([]);
    try {
      const response = await fetch(
        `/api/restaurants/search?query=${encodeURIComponent(query.trim())}`,
      );
      const data = (await response.json()) as { places?: RestaurantPlace[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Restaurant search failed");
      setMatches(data.places ?? []);
      if (!data.places?.length)
        setMessage("No restaurants found. Add the city to your search or paste a Maps link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restaurant search failed");
    } finally {
      setSearching(false);
    }
  }

  function choose(place: RestaurantPlace) {
    onVenueChange(place);
    onActivityChange(null);
    setActivityMessage(null);
    setMatches([]);
    setMessage(null);
    void enrich(place.googleMapsUrl, place.placeId, place);
  }

  async function enrich(googleMapsUrl: string, placeId?: string, selected?: SelectedVenue) {
    setEnriching(true);
    setActivityMessage(null);
    onActivityChange(null);
    try {
      const response = await fetch("/api/restaurants/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsUrl, ...(placeId ? { placeId } : {}) }),
      });
      const data = (await response.json()) as {
        activity?: VenueActivity;
        activityError?: string;
        error?: string;
      };
      if (!response.ok || !data.activity)
        throw new Error(data.error ?? "Maps activity is unavailable");
      const currentVenue = selected ?? venue;
      const sameVenue = currentVenue?.placeId === data.activity.placeId;
      if (data.activity.latitude !== undefined && data.activity.longitude !== undefined) {
        onVenueChange({
          placeId: data.activity.placeId,
          name: data.activity.title ?? currentVenue?.name ?? "Google Maps restaurant",
          address: data.activity.address ?? currentVenue?.address ?? "",
          latitude: data.activity.latitude,
          longitude: data.activity.longitude,
          googleMapsUrl,
          source: "Apify Google Places",
          ...(data.activity.rating === undefined ? {} : { rating: data.activity.rating }),
          ...(data.activity.reviewCount === undefined
            ? {}
            : { reviewCount: data.activity.reviewCount }),
        });
      } else if (!sameVenue) {
        throw new Error(
          "Maps returned no coordinates for this restaurant. Select a Places result instead.",
        );
      }
      onActivityChange(data.activity);
      if (data.activityError) setActivityMessage(data.activityError);
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Maps activity is unavailable");
    } finally {
      setEnriching(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-bg-raised p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-ok">
            Real restaurant connection
          </p>
          <h2 className="mt-2 font-serif text-3xl">Bring a venue into the model</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-text-2">
          Find a real restaurant with Apify, then import its location, menu link, review topics and
          weekday traffic pattern when Google Maps exposes them.
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <form onSubmit={search} className="flex gap-2">
          <label className="sr-only" htmlFor="restaurant-search">
            Restaurant and city
          </label>
          <input
            id="restaurant-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Restaurant name and city"
            className="min-w-0 flex-1 rounded-md border border-input bg-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-md border border-ok px-4 text-xs text-ok disabled:opacity-50"
          >
            {searching ? "Searching…" : "Find"}
          </button>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (mapsUrl.trim()) void enrich(mapsUrl.trim());
          }}
          className="flex gap-2"
        >
          <label className="sr-only" htmlFor="restaurant-maps-url">
            Google Maps link
          </label>
          <input
            id="restaurant-maps-url"
            type="url"
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.target.value)}
            placeholder="Or paste a Google Maps link"
            className="min-w-0 flex-1 rounded-md border border-input bg-bg px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={enriching} className="px-4 text-xs">
            {enriching ? "Loading…" : "Import"}
          </Button>
        </form>
      </div>
      {message ? (
        <p className="mt-3 text-xs text-warn" role="status">
          {message}
        </p>
      ) : null}
      {matches.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {matches.map((place) => (
            <button
              key={place.placeId}
              type="button"
              onClick={() => choose(place)}
              className="rounded-md border border-line p-3 text-left hover:border-accent"
            >
              <span className="block text-sm font-semibold">{place.name}</span>
              <span className="mt-1 block text-xs text-text-2">{place.address}</span>
              <span className="mt-2 block font-mono text-[10px] text-ok">Import with Apify</span>
            </button>
          ))}
        </div>
      ) : null}

      {venue ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.12em] text-ok">
              Connected · {venue.source}
            </p>
            <p className="mt-1 text-lg font-semibold">{venue.name}</p>
            <p className="text-xs text-text-2">
              {venue.address} · {venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}
            </p>
            <a
              href={venue.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-ok underline-offset-4 hover:underline"
            >
              View on Google Maps
            </a>
            <button
              type="button"
              onClick={() => {
                onVenueChange(null);
                onActivityChange(null);
                setActivityMessage(null);
              }}
              className="ml-4 text-xs text-text-2 underline-offset-4 hover:underline"
            >
              Return to SF demo
            </button>
          </div>
          <button
            type="button"
            onClick={() => void enrich(venue.googleMapsUrl, venue.placeId || undefined)}
            disabled={enriching}
            className="rounded-md border border-ok px-4 py-2 text-xs text-ok disabled:opacity-50"
          >
            {enriching
              ? "Loading activity…"
              : activity
                ? "Refresh Apify activity"
                : "Load Apify activity"}
          </button>
        </div>
      ) : null}
      {activityMessage ? (
        <p className="mt-3 text-xs text-warn" role="status">
          {activityMessage}
        </p>
      ) : null}
      {activity ? (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.16em] text-ok">
                Apify · weekday dinner pattern
              </p>
              <p className="mt-1 text-xs text-text-2">
                {activity.category ? `${activity.category} · ` : ""}
                {activity.rating !== undefined ? `${activity.rating} stars · ` : ""}
                {activity.reviewCount !== undefined
                  ? `${activity.reviewCount.toLocaleString()} reviews · `
                  : ""}
                {activity.priceRange ? `${activity.priceRange} · ` : ""}
                observed {new Date(activity.observedAt).toLocaleString()}
              </p>
              {activity.menuUrl ? (
                <a
                  href={activity.menuUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-ok underline-offset-4 hover:underline"
                >
                  View restaurant menu
                </a>
              ) : null}
            </div>
            <p className="max-w-sm text-xs text-text-2">
              Relative traffic and review topics are context, not orders. Dish quantities remain an
              illustrative scenario without restaurant sales data.
            </p>
          </div>
          {Number.isFinite(activityAgeDays) && activityAgeDays >= 7 ? (
            <p className="mt-3 rounded-md border border-warn/50 bg-warn-wash p-3 text-xs text-warn">
              This saved venue snapshot is {activityAgeDays} days old. Refresh Apify activity before
              using its traffic pattern for a real prep decision.
            </p>
          ) : null}
          {daily.some((day) => day.value !== null) ? (
            <div
              className="mt-4 grid grid-cols-7 gap-2"
              role="img"
              aria-label="Average Google Maps popularity for dinner hours by weekday"
            >
              {daily.map(({ day, value }) => (
                <div key={day} className="min-w-0">
                  <div className="flex h-20 items-end rounded-sm bg-bg p-1">
                    <div
                      className="w-full rounded-sm bg-ok/70"
                      style={{ height: `${value ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center font-mono text-[9px] text-text-2">
                    {day.slice(0, 3)}
                  </p>
                  <p className="text-center font-mono text-[9px]">
                    {value === null ? "—" : Math.round(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {activity.openingHours.length > 0 ? (
            <div className="mt-4">
              <p className="font-mono text-[9px] uppercase tracking-[.12em] text-text-2">
                Published service hours · confirm holiday changes
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activity.openingHours.map(({ day, hours }) => (
                  <span
                    key={day}
                    className="rounded-full border border-line px-2 py-1 text-xs text-text-2"
                  >
                    {day.slice(0, 3)} {hours}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {activity.reviewTopics.length > 0 ? (
            <div className="mt-4">
              <p className="font-mono text-[9px] uppercase tracking-[.12em] text-text-2">
                Guest-mentioned topics · tap a dish to replace {selectedDishName}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activity.reviewTopics.slice(0, 6).map(({ topic, count }) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => onUseReviewTopic(topic)}
                    title={`Use ${topic} as the selected illustrative prep item`}
                    className="rounded-full border border-line px-2 py-1 text-xs text-text-2"
                  >
                    {topic} · {count} mentions +
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-2">
                You choose which topics are actual dishes. Mention counts never set order shares or
                forecast quantities.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
