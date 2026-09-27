import type { MenuItem } from "./simulation";

export type ReviewTopic = { topic: string; count: number };
export type DishMatch = {
  topic: string;
  mentions: number;
  status: "matched" | "not_dish" | "review";
  confidence: number;
  menuId?: string;
  menuName?: string;
};

type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export function interpretDishAnswers(
  topics: ReviewTopic[],
  menu: Pick<MenuItem, "id" | "name">[],
  answers: Record<string, unknown>,
): DishMatch[] {
  return topics.map(({ topic, count }, index) => {
    const raw = answers[`topic_${index}`];
    const answer = raw && typeof raw === "object" ? (raw as Partial<ChoiceAnswer>) : null;
    const confidence =
      answer?.type === "choice" &&
      typeof answer.confidence === "number" &&
      Number.isFinite(answer.confidence)
        ? Math.max(0, Math.min(1, answer.confidence))
        : 0;
    const choice = answer?.type === "choice" ? answer.choice : undefined;
    const menuIndex =
      typeof choice === "string" && /^dish_\d+$/.test(choice) ? Number(choice.slice(5)) : -1;
    const item = menu[menuIndex];
    if (item && confidence >= 0.5) {
      return {
        topic,
        mentions: count,
        status: "matched",
        confidence,
        menuId: item.id,
        menuName: item.name,
      };
    }
    return {
      topic,
      mentions: count,
      status: choice === "not_dish" && confidence >= 0.5 ? "not_dish" : "review",
      confidence,
    };
  });
}

export async function identifyMenuDishesWithJev(
  restaurant: string,
  menuSource: string,
  menu: Pick<MenuItem, "id" | "name">[],
  topics: ReviewTopic[],
): Promise<DishMatch[]> {
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) throw new Error("Jev dish identification is not configured");

  const criteria = Object.fromEntries([
    ...menu.map((item, index) => [
      `dish_${index}`,
      `The topic clearly refers to the published menu dish ${item.name}.`,
    ]),
    [
      "not_dish",
      "The topic describes music, seating, service, atmosphere, or another non-food feature.",
    ],
    ["uncertain", "The topic may be food, but no listed menu dish clearly matches it."],
  ]);
  const questions = Object.fromEntries(
    topics.map(({ topic }, index) => [
      `topic_${index}`,
      {
        type: "choice",
        instructions: `For the guest-mentioned topic "${topic}", choose the exact published menu dish it names or clearly abbreviates. Do not use mention counts as sales and do not invent a dish.`,
        criteria,
      },
    ]),
  );

  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.JEV_MODEL ?? "jev-latest",
      state: {
        restaurant,
        menuSource,
        publishedMenuDishes: menu.map(({ id, name }) => ({ id, name })),
        guestMentionedTopics: topics,
      },
      questions,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Jev request failed with ${response.status}`);
  const data = (await response.json()) as { answers?: Record<string, unknown> };
  if (!data.answers || typeof data.answers !== "object")
    throw new Error("Jev returned no dish answers");
  return interpretDishAnswers(topics, menu, data.answers);
}
