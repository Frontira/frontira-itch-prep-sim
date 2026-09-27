import { NextResponse } from "next/server";
import { type OpenMeteoForecast, summarizeWeather } from "@/lib/weather";

export const revalidate = 900;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude") ?? "37.7749");
  const longitude = Number(url.searchParams.get("longitude") ?? "-122.4194");
  const today = new Date();
  const localDateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(today)
      .map((part) => [part.type, part.value]),
  );
  const serviceDate =
    url.searchParams.get("serviceDate") ??
    `${localDateParts.year}-${localDateParts.month}-${localDateParts.day}`;

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
  endpoint.searchParams.set("forecast_days", "3");

  try {
    const response = await fetch(endpoint, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const forecast = (await response.json()) as OpenMeteoForecast;
    return NextResponse.json(summarizeWeather(forecast, serviceDate));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weather unavailable" },
      { status: 502 },
    );
  }
}
