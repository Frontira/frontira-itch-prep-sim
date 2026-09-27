export type TrendsSignal = {
  source: "Google Trends CSV";
  label: string;
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
  const values = csv.split(/\r?\n/).flatMap((line) => {
    const columns = line.split(",");
    if (!/^\s*"?\d{4}-\d{2}/.test(columns[0] ?? "")) return [];
    const value = parseNumeric(columns.at(-1) ?? "");
    return value === null ? [] : [value];
  });

  if (values.length < 4) throw new Error("The Trends CSV needs at least four dated observations");
  const recentWindow = Math.max(1, Math.min(7, Math.floor(values.length / 3)));
  const recent = values.slice(-recentWindow);
  const baseline = values.slice(0, -recentWindow);
  const average = (series: number[]) =>
    series.reduce((sum, value) => sum + value, 0) / series.length;
  const recentIndex = average(recent);
  const baselineIndex = average(baseline);
  const momentum = baselineIndex === 0 ? 0 : ((recentIndex - baselineIndex) / baselineIndex) * 100;

  return {
    source: "Google Trends CSV",
    label,
    observations: values.length,
    recentIndex: Math.round(recentIndex * 10) / 10,
    baselineIndex: Math.round(baselineIndex * 10) / 10,
    momentum: Math.max(-40, Math.min(40, Math.round(momentum * 10) / 10)),
    confidence: Math.min(1, values.length / 28),
  };
}
