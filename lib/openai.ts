import type { SimulationResult } from "./simulation";

export async function summarizeScenario(result: SimulationResult) {
  const apiKey = process.env.OPENAI_API_KEY;
  const topRisk = [...result.recommendations].sort((a, b) => b.shortageRisk - a.shortageRisk)[0];
  const fallback = `${topRisk?.name ?? "The highest-risk item"} needs the closest watch. The simulated plan projects ${result.averageShortageRisk}% average shortage risk and $${result.projectedWasteCost.toFixed(2)} in waste exposure.`;
  if (!apiKey) return { source: "local" as const, summary: fallback };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      instructions:
        "Write one concise, operational sentence for a restaurant chef. State the most important prep action and why. Do not mention AI or simulation mechanics.",
      input: JSON.stringify(result),
      max_output_tokens: 100,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}`);
  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text =
    data.output_text ??
    data.output?.flatMap((item) => item.content ?? []).find((content) => content.text)?.text;
  return { source: "openai" as const, summary: text?.trim() || fallback };
}
