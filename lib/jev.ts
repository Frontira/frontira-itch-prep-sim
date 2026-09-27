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
  action: "hold" | "prep" | "review";
  confidence: number;
  shortageRiskScore: number;
};

export async function evaluatePrepDecision(state: unknown): Promise<JevDecision> {
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) return { source: "local", action: "review", confidence: 0, shortageRiskScore: 2 };

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
            hold: "Current prep plan is sufficient with acceptable waste and shortage risk.",
            prep: "Increase prep now because shortage risk is material and evidence is clear.",
            review: "Inputs or tradeoffs are too uncertain for an automated action.",
          },
        },
        shortageRisk: {
          type: "score",
          instructions: "Rate the operational shortage risk.",
          criteria: ["Low", "Moderate", "High", "Critical"],
        },
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error(`Jev request failed with ${response.status}`);
  const data = (await response.json()) as { answers: Record<string, JevAnswer> };
  const action = data.answers.action;
  const shortageRisk = data.answers.shortageRisk;
  if (action?.type !== "choice" || shortageRisk?.type !== "score")
    throw new Error("Jev returned an unexpected answer shape");

  return {
    source: "jev",
    action: action.choice === "hold" || action.choice === "prep" ? action.choice : "review",
    confidence: action.confidence,
    shortageRiskScore: shortageRisk.score,
  };
}
