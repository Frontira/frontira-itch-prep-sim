import { NextResponse } from "next/server";
import { identifyMenuDishesWithJev, type ReviewTopic } from "@/lib/dish-identification";
import { JOHNS_GRILL_MENU_URL, JOHNS_GRILL_PLACE_ID, scenarioMenuForVenue } from "@/lib/venue-menu";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Provide a connected venue" }, { status: 400 });
  const input = body as { placeId?: unknown; reviewTopics?: unknown };
  if (input.placeId !== JOHNS_GRILL_PLACE_ID)
    return NextResponse.json(
      { error: "A verified published menu is not connected for this venue" },
      { status: 422 },
    );
  if (!Array.isArray(input.reviewTopics) || input.reviewTopics.length > 12)
    return NextResponse.json({ error: "Provide up to 12 review topics" }, { status: 400 });
  const topics: ReviewTopic[] = input.reviewTopics.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const candidate = raw as { topic?: unknown; count?: unknown };
    const topic = typeof candidate.topic === "string" ? candidate.topic.trim() : "";
    const count = candidate.count;
    return topic.length > 0 &&
      topic.length <= 80 &&
      typeof count === "number" &&
      Number.isFinite(count) &&
      count >= 0
      ? [{ topic, count }]
      : [];
  });
  if (topics.length === 0 || topics.length !== input.reviewTopics.length)
    return NextResponse.json({ error: "Review topics are missing or invalid" }, { status: 400 });

  const menu = scenarioMenuForVenue(JOHNS_GRILL_PLACE_ID);
  if (!menu) return NextResponse.json({ error: "Menu unavailable" }, { status: 503 });
  try {
    const matches = await identifyMenuDishesWithJev(
      "John's Grill",
      JOHNS_GRILL_MENU_URL,
      menu,
      topics,
    );
    return NextResponse.json({
      source: "Jev",
      menuSource: JOHNS_GRILL_MENU_URL,
      observedAt: new Date().toISOString(),
      matches,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Jev dish identification failed" },
      { status: 502 },
    );
  }
}
