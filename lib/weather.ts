export type WeatherSignal = {
  source: "Open-Meteo";
  observedAt: string;
  serviceDate: string;
  temperatureF: number;
  rainProbability: number;
  precipitationInches: number;
  windGustMph: number;
  coverEffect: number;
  menuEffect: "cold-weather" | "warm-weather" | "neutral";
  confidence: number;
};

export type WeatherHorizon = {
  source: "Open-Meteo";
  latitude: number;
  longitude: number;
  timezone: string;
  days: WeatherSignal[];
};

export type OpenMeteoForecast = {
  timezone: string;
  hourly: {
    time: string[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    wind_gusts_10m: number[];
  };
};

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function addDaysToIsoDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid ISO date");
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function summarizeWeather(
  forecast: OpenMeteoForecast,
  serviceDate: string,
  observedAt = new Date().toISOString(),
): WeatherSignal {
  const indexes = forecast.hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => {
      const hour = Number(time.slice(11, 13));
      return time.startsWith(serviceDate) && hour >= 17 && hour <= 22;
    })
    .map(({ index }) => index);

  if (indexes.length === 0) throw new Error("No dinner-service forecast is available");
  const average = (values: number[]) =>
    indexes.reduce((sum, index) => sum + (values[index] ?? 0), 0) / indexes.length;
  const maximum = (values: number[]) => Math.max(...indexes.map((index) => values[index] ?? 0));

  const temperatureF = average(forecast.hourly.apparent_temperature);
  const rainProbability = maximum(forecast.hourly.precipitation_probability);
  const precipitationInches = indexes.reduce(
    (sum, index) => sum + (forecast.hourly.precipitation[index] ?? 0),
    0,
  );
  const windGustMph = maximum(forecast.hourly.wind_gusts_10m);
  const rainPenalty = rainProbability >= 70 ? -7 : rainProbability >= 40 ? -4 : -1;
  const windPenalty = windGustMph >= 30 ? -3 : windGustMph >= 20 ? -1 : 0;
  const temperaturePenalty = temperatureF < 45 || temperatureF > 85 ? -2 : 0;

  return {
    source: "Open-Meteo",
    observedAt,
    serviceDate,
    temperatureF: round(temperatureF),
    rainProbability: round(rainProbability),
    precipitationInches: round(precipitationInches, 2),
    windGustMph: round(windGustMph),
    coverEffect: rainPenalty + windPenalty + temperaturePenalty,
    menuEffect:
      temperatureF < 58 || rainProbability >= 55
        ? "cold-weather"
        : temperatureF > 76
          ? "warm-weather"
          : "neutral",
    confidence: indexes.length / 6,
  };
}
