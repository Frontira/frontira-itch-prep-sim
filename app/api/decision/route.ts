import { NextResponse } from "next/server";
import { evaluatePrepDecision } from "@/lib/jev";

export async function POST(request: Request) {
  try {
    const state = await request.json();
    return NextResponse.json(await evaluatePrepDecision(state));
  } catch (error) {
    return NextResponse.json({
      source: "local",
      action: "review",
      confidence: 0,
      shortageRiskScore: 2,
      probabilities: { decrease: 0, hold: 0, increase: 0, review: 1 },
      signalConfidence: 0,
      items: [],
      error: error instanceof Error ? error.message : "Decision unavailable",
    });
  }
}
