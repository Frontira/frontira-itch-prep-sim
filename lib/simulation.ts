export type ScenarioInputs = {
  covers: number;
  weatherUplift: number;
  trendUplift: number;
  eventUplift: number;
  venueUplift?: number;
  noShowRate: number;
  safetyStock: number;
  runs?: number;
  seed?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  station: string;
  orderShare: number;
  unit: string;
  unitCost: number;
  baselinePar: number;
  weatherSensitivity: number;
  trendSensitivity: number;
  eventSensitivity: number;
};

export type PrepRecommendation = MenuItem & {
  expectedDemand: number;
  recommendedPrep: number;
  shortageRisk: number;
  expectedWaste: number;
  baselineWaste: number;
  baselineShortageRisk: number;
  demandDistribution: {
    min: number;
    max: number;
    p10: number;
    p50: number;
    p90: number;
    bins: Array<{ from: number; to: number; count: number }>;
  };
  contributions: {
    bookedDemand: number;
    weather: number;
    trends: number;
    events: number;
    venue: number;
  };
};

export type SimulationResult = {
  effectiveCovers: number;
  runs: number;
  coverDistribution: {
    min: number;
    max: number;
    p10: number;
    p50: number;
    p90: number;
    bins: Array<{ from: number; to: number; count: number }>;
  };
  recommendations: PrepRecommendation[];
  projectedWasteCost: number;
  baselineWasteCost: number;
  averageShortageRisk: number;
  baselineShortageRisk: number;
};

export const DEMO_MENU: MenuItem[] = [
  {
    id: "cod",
    name: "Black cod",
    station: "Fish",
    orderShare: 0.19,
    unit: "portions",
    unitCost: 8.8,
    baselinePar: 34,
    weatherSensitivity: 0.8,
    trendSensitivity: 0.35,
    eventSensitivity: 0.8,
  },
  {
    id: "beef",
    name: "Braised beef",
    station: "Hot line",
    orderShare: 0.17,
    unit: "portions",
    unitCost: 6.9,
    baselinePar: 31,
    weatherSensitivity: 0.35,
    trendSensitivity: 0.3,
    eventSensitivity: 0.8,
  },
  {
    id: "gnocchi",
    name: "Wild garlic gnocchi",
    station: "Pasta",
    orderShare: 0.23,
    unit: "portions",
    unitCost: 2.6,
    baselinePar: 39,
    weatherSensitivity: 0.2,
    trendSensitivity: 0.9,
    eventSensitivity: 0.9,
  },
  {
    id: "greens",
    name: "Market greens",
    station: "Garde manger",
    orderShare: 0.31,
    unit: "portions",
    unitCost: 1.7,
    baselinePar: 52,
    weatherSensitivity: 1.35,
    trendSensitivity: 0.65,
    eventSensitivity: 0.7,
  },
  {
    id: "bread",
    name: "Sourdough",
    station: "Bakery",
    orderShare: 0.82,
    unit: "servings",
    unitCost: 0.75,
    baselinePar: 132,
    weatherSensitivity: 1,
    trendSensitivity: 0.1,
    eventSensitivity: 1,
  },
  {
    id: "dessert",
    name: "Chocolate crémeux",
    station: "Pastry",
    orderShare: 0.28,
    unit: "portions",
    unitCost: 2.15,
    baselinePar: 46,
    weatherSensitivity: 0.7,
    trendSensitivity: 0.75,
    eventSensitivity: 0.85,
  },
];

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number) {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))] ?? 0;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildHistogram(values: number[], binCount = 14) {
  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));
  const span = Math.max(1, max - min);
  const binWidth = span / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    from: round(min + index * binWidth),
    to: round(min + (index + 1) * binWidth),
    count: 0,
  }));
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.floor(((value - min) / span) * binCount));
    const bin = bins[index];
    if (bin) bin.count += 1;
  }
  return { min, max, bins };
}

export function simulatePrep(inputs: ScenarioInputs, menu = DEMO_MENU): SimulationResult {
  const runs = Math.max(1_000, Math.min(inputs.runs ?? 2_000, 20_000));
  const random = mulberry32(inputs.seed ?? 42);
  const bookedCovers = Math.max(0, inputs.covers * (1 - inputs.noShowRate / 100));
  const expectedCovers = Math.max(
    0,
    bookedCovers *
      (1 + inputs.weatherUplift / 100 + inputs.eventUplift / 100 + (inputs.venueUplift ?? 0) / 100),
  );
  const coverOutcomes = Array.from({ length: runs }, () => {
    const serviceShock = normal(random) * 0.055;
    const arrivalNoise = normal(random) * Math.max(1.5, Math.sqrt(expectedCovers) * 0.45);
    return Math.max(0, Math.round(expectedCovers * (1 + serviceShock) + arrivalNoise));
  });
  const effectiveCovers = coverOutcomes.reduce((sum, value) => sum + value, 0) / runs;
  const histogram = buildHistogram(coverOutcomes);
  const serviceLevel = Math.min(0.99, Math.max(0.55, 0.78 + inputs.safetyStock / 100));

  const recommendations = menu.map((item) => {
    const bookedDemand = bookedCovers * item.orderShare;
    const weatherContribution =
      bookedDemand * (inputs.weatherUplift / 100) * item.weatherSensitivity;
    const trendContribution = bookedDemand * (inputs.trendUplift / 100) * item.trendSensitivity;
    const eventContribution = bookedDemand * (inputs.eventUplift / 100) * item.eventSensitivity;
    const venueContribution = bookedDemand * ((inputs.venueUplift ?? 0) / 100);
    const demandMean = Math.max(
      0,
      bookedDemand +
        weatherContribution +
        trendContribution +
        eventContribution +
        venueContribution,
    );
    const demands = Array.from({ length: runs }, () => {
      const sharedServiceShock = normal(random) * 0.1;
      const itemNoise = normal(random) * Math.max(1.2, Math.sqrt(demandMean) * 0.55);
      return Math.max(0, Math.round(demandMean * (1 + sharedServiceShock) + itemNoise));
    });
    const expectedDemand = demands.reduce((sum, value) => sum + value, 0) / runs;
    const recommendedPrep = Math.max(0, Math.ceil(percentile(demands, serviceLevel)));
    const shortageRisk = demands.filter((value) => value > recommendedPrep).length / runs;
    const baselineShortageRisk = demands.filter((value) => value > item.baselinePar).length / runs;
    const expectedWaste =
      demands.reduce((sum, value) => sum + Math.max(0, recommendedPrep - value), 0) / runs;
    const baselineWaste =
      demands.reduce((sum, value) => sum + Math.max(0, item.baselinePar - value), 0) / runs;
    const demandHistogram = buildHistogram(demands);

    return {
      ...item,
      expectedDemand: round(expectedDemand),
      recommendedPrep,
      shortageRisk: round(shortageRisk * 100),
      expectedWaste: round(expectedWaste),
      baselineWaste: round(baselineWaste),
      baselineShortageRisk: round(baselineShortageRisk * 100),
      demandDistribution: {
        ...demandHistogram,
        p10: percentile(demands, 0.1),
        p50: percentile(demands, 0.5),
        p90: percentile(demands, 0.9),
      },
      contributions: {
        bookedDemand: round(bookedDemand),
        weather: round(weatherContribution),
        trends: round(trendContribution),
        events: round(eventContribution),
        venue: round(venueContribution),
      },
    };
  });

  const projectedWasteCost = recommendations.reduce(
    (sum, item) => sum + item.expectedWaste * item.unitCost,
    0,
  );
  const baselineWasteCost = recommendations.reduce(
    (sum, item) => sum + item.baselineWaste * item.unitCost,
    0,
  );

  return {
    effectiveCovers: round(effectiveCovers),
    runs,
    coverDistribution: {
      ...histogram,
      p10: percentile(coverOutcomes, 0.1),
      p50: percentile(coverOutcomes, 0.5),
      p90: percentile(coverOutcomes, 0.9),
    },
    recommendations,
    projectedWasteCost: round(projectedWasteCost, 2),
    baselineWasteCost: round(baselineWasteCost, 2),
    averageShortageRisk: round(
      recommendations.reduce((sum, item) => sum + item.shortageRisk, 0) / recommendations.length,
    ),
    baselineShortageRisk: round(
      recommendations.reduce((sum, item) => sum + item.baselineShortageRisk, 0) /
        recommendations.length,
    ),
  };
}
