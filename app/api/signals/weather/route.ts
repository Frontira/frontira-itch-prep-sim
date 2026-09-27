import { NextResponse } from "next/server";
import {
  addDaysToIsoDate,
  type OpenMeteoForecast,
  summarizeWeather,
  type WeatherHorizon,
} from "@/lib/weather";

export const revalidate = 900;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude") ?? "37.7749");
  const longitude = Number(url.searchParams.get("longitude") ?? "-122.4194");
  const requestedStartDate = url.searchParams.get("serviceDate");

  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", String(latitude));
  endpoint.searchParams.set("longitude", String(longitude));
  endpoint.searchParams.set(
    "hourly",
    "apparent_temperature,precipitation_probability,precipitation,wind_gusts_10m",
  );
  endpoint.searchParams.set("temperature_unit", "fahrenheit");
  endpoint.searchParams.set("precipitation_unit", "inch");
  endpoint.searchParams.set("wind_speed_unit", "mph");
  endpoint.searchParams.set("timezone", "auto");
  endpoint.searchParams.set("forecast_days", "4");

  try {
    const response = await fetch(endpoint, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const forecast = (await response.json()) as OpenMeteoForecast;
    const localDateParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: forecast.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    const localToday = `${localDateParts.year}-${localDateParts.month}-${localDateParts.day}`;
    const startDate = requestedStartDate ?? addDaysToIsoDate(localToday, 1);
    const serviceDates = Array.from({ length: 3 }, (_, index) =>
      addDaysToIsoDate(startDate, index),
    );
    const horizon: WeatherHorizon = {
      source: "Open-Meteo",
      latitude,
      longitude,
      timezone: forecast.timezone,
      days: serviceDates.map((serviceDate) => summarizeWeather(forecast, serviceDate)),
    };
    return NextResponse.json(horizon);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weather unavailable" },
      { status: 502 },
    );
  }
}
