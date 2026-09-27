type JevAnswer =
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | {
      type: "score";
      score: number;
      confidence: number;
      probabilities: Record<string, number>;
      legend: Record<string, string>;
    }
  | { type: "noul"; noul: number };

export type JevDecision = {
  source: "jev" | "local";
  action: "decrease" | "hold" | "increase" | "review";
  confidence: number;
  shortageRiskScore: number;
  probabilities: Record<string, number>;
  signalConfidence: number;
  items: Array<{
    id: string;
    name: string;
    action: "decrease" | "hold" | "increase" | "review";
    confidence: number;
    probabilities: Record<string, number>;
  }>;
};

export async function evaluatePrepDecision(state: unknown): Promise<JevDecision> {
  const apiKey = process.env.JEV_API_KEY;
  const recommendations = extractRecommendations(state);
  if (!apiKey) return localDecision(recommendations);

  const itemQuestions = Object.fromEntries(
    recommendations.map((item) => [
      `item_${item.id}`,
      {
        type: "choice",
        instructions: `Choose the safest prep action for ${item.name}.`,
        criteria: {
          decrease:
            "Prepare fewer units because expected waste materially outweighs shortage risk.",
          hold: "Keep the recommended quantity because waste and shortage risk are balanced.",
          increase: "Prepare more units because the evidence indicates material shortage risk.",
          review: "The evidence is conflicting or too uncertain for an automatic action.",
        },
      },
    ]),
  );

  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.JEV_MODEL ?? "jev-latest",
      state,
      questions: {
        action: {
          type: "choice",
          instructions: "Choose the safest kitchen prep action for this simulated service.",
          criteria: {
            decrease:
              "Reduce the overall prep plan because expected waste materially outweighs shortage risk.",
            hold: "Current prep plan is sufficient with acceptable waste and shortage risk.",
            increase: "Increase prep now because shortage risk is material and evidence is clear.",
            review: "Inputs or tradeoffs are too uncertain for an automated action.",
          },
        },
        shortageRisk: {
          type: "score",
          instructions: "Rate the operational shortage risk.",
          criteria: ["Low", "Moderate", "High", "Critical"],
        },
        signalConfidence: {
          type: "score",
          instructions:
            "Rate how credible and decision-relevant the combined booking, weather, search-trend, event, and venue-activity evidence is. Treat Maps popularity as a weak traffic prior, not observed sales.",
          criteria: ["Weak", "Directional", "Useful", "Strong"],
        },
        ...itemQuestions,
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error(`Jev request failed with ${response.status}`);
  const data = (await response.json()) as { answers: Record<string, JevAnswer> };
  const action = data.answers.action;
  const shortageRisk = data.answers.shortageRisk;
  const signalConfidence = data.answers.signalConfidence;
  if (
    action?.type !== "choice" ||
    shortageRisk?.type !== "score" ||
    signalConfidence?.type !== "score"
  )
    throw new Error("Jev returned an unexpected answer shape");

  return {
    source: "jev",
    action: normalizeAction(action.choice),
    confidence: action.confidence,
    shortageRiskScore: shortageRisk.score,
    probabilities: action.probabilities,
    signalConfidence: signalConfidence.score,
    items: recommendations.flatMap((item) => {
      const answer = data.answers[`item_${item.id}`];
      return answer?.type === "choice"
        ? [
            {
              id: item.id,
              name: item.name,
              action: normalizeAction(answer.choice),
              confidence: answer.confidence,
              probabilities: answer.probabilities,
            },
          ]
        : [];
    }),
  };
}

type RecommendationSummary = {
  id: string;
  name: string;
  recommendedPrep: number;
  baselinePar: number;
};

function extractRecommendations(state: unknown): RecommendationSummary[] {
  if (!state || typeof state !== "object") return [];
  const result = (state as { result?: { recommendations?: unknown } }).result;
  if (!Array.isArray(result?.recommendations)) return [];
  return result.recommendations.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<RecommendationSummary>;
    return typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.recommendedPrep === "number" &&
      typeof candidate.baselinePar === "number"
      ? [candidate as RecommendationSummary]
      : [];
  });
}

function normalizeAction(value: string): JevDecision["action"] {
  return value === "decrease" || value === "hold" || value === "increase" ? value : "review";
}

function localDecision(recommendations: RecommendationSummary[]): JevDecision {
  const items = recommendations.map((item) => {
    const delta = item.recommendedPrep - item.baselinePar;
    const action: JevDecision["action"] =
      delta >= 2 ? "increase" : delta <= -2 ? "decrease" : "hold";
    const probabilities = {
      decrease: action === "decrease" ? 0.72 : 0.1,
      hold: action === "hold" ? 0.72 : 0.18,
      increase: action === "increase" ? 0.72 : 0.1,
      review: 0,
    };
    return { ...item, action, confidence: 0.72, probabilities };
  });
  const actionNames = ["decrease", "hold", "increase", "review"] as const;
  const probabilities = Object.fromEntries(
    actionNames.map((action) => [
      action,
      items.length === 0
        ? action === "review"
          ? 1
          : 0
        : items.reduce((sum, item) => sum + item.probabilities[action], 0) / items.length,
    ]),
  );
  const action = actionNames.reduce((leader, candidate) =>
    probabilities[candidate] > probabilities[leader] ? candidate : leader,
  );
  return {
    source: "local",
    action,
    confidence: probabilities[action],
    shortageRiskScore: 2,
    probabilities,
    signalConfidence: 1,
    items,
  };
}
