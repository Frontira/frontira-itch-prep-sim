import { NextResponse } from "next/server";
import { summarizeScenario } from "@/lib/openai";
import type { SimulationResult } from "@/lib/simulation";

export async function POST(request: Request) {
  const result = (await request.json()) as SimulationResult;
  try {
    return NextResponse.json(await summarizeScenario(result));
  } catch {
    const topRisk = [...result.recommendations].sort((a, b) => b.shortageRisk - a.shortageRisk)[0];
    return NextResponse.json({
      source: "local",
      summary: `${topRisk?.name ?? "The highest-risk item"} needs the closest watch. Keep the prep sheet under review as bookings change.`,
    });
  }
}
