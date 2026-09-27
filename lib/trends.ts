export type TrendsSignal = {
  source: "Google Trends CSV";
  label: string;
  geography: string;
  period: string;
  comparison: string;
  terms: string[];
  observations: number;
  recentIndex: number;
  baselineIndex: number;
  momentum: number;
  confidence: number;
};

function parseNumeric(value: string) {
  const normalized = value.replace(/["<>%+,]/g, "").trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseGoogleTrendsCsv(csv: string, label = "Menu interest"): TrendsSignal {
  const lines = csv.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^(Day|Week|Month|Year),/i.test(line.trim()));
  const header = headerIndex >= 0 ? (lines[headerIndex]?.split(",") ?? []) : [];
  const series = header.slice(1);
  const terms = series.map((column) => column.split(":")[0]?.trim()).filter(Boolean) as string[];
  const geography = series[0]?.match(/\(([^)]+)\)\s*$/)?.[1] ?? "Geography not found in CSV";
  const datedRows = lines.slice(Math.max(0, headerIndex + 1)).flatMap((line) => {
    const columns = line.split(",");
    if (!/^\s*"?\d{4}-\d{2}/.test(columns[0] ?? "")) return [];
    const values = columns
      .slice(1)
      .map(parseNumeric)
      .filter((value): value is number => value !== null);
    return values.length === 0
      ? []
      : [{ date: (columns[0] ?? "").replaceAll('"', "").trim(), value: average(values) }];
  });
  const values = datedRows.map(({ value }) => value);

  if (values.length < 4) throw new Error("The Trends CSV needs at least four dated observations");
  const recentWindow = Math.max(1, Math.min(7, Math.floor(values.length / 3)));
  const recent = values.slice(-recentWindow);
  const baseline = values.slice(0, -recentWindow);
  const recentIndex = average(recent);
  const baselineIndex = average(baseline);
  const momentum = baselineIndex === 0 ? 0 : ((recentIndex - baselineIndex) / baselineIndex) * 100;

  return {
    source: "Google Trends CSV",
    label,
    geography,
    period: `${datedRows[0]?.date ?? "Unknown"} to ${datedRows.at(-1)?.date ?? "Unknown"}`,
    comparison: `${recent.length} recent ${recent.length === 1 ? "point" : "points"} vs ${baseline.length} earlier ${baseline.length === 1 ? "point" : "points"}`,
    terms,
    observations: values.length,
    recentIndex: Math.round(recentIndex * 10) / 10,
    baselineIndex: Math.round(baselineIndex * 10) / 10,
    momentum: Math.max(-40, Math.min(40, Math.round(momentum * 10) / 10)),
    confidence: Math.min(1, values.length / 28),
  };
}

function average(series: number[]) {
  return series.reduce((sum, value) => sum + value, 0) / series.length;
}
