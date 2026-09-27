import type { MenuItem } from "./simulation";

export const JOHNS_GRILL_PLACE_ID = "ChIJe9MuVY-AhYARb8Su4vUOneY";
export const JOHNS_GRILL_MENU_URL = "https://www.johnsgrill.com/menu/dinner-menu-1/";

// Names are from John's Grill's published January 2026 dinner menu. Every
// numeric field below is an illustrative operator scenario, not POS data.
export const JOHNS_GRILL_SCENARIO_MENU: MenuItem[] = [
  {
    id: "new-york-steak",
    name: "New York Steak",
    station: "Grill",
    orderShare: 0.18,
    unit: "portions",
    unitCost: 18,
    baselinePar: 26,
    weatherSensitivity: 0.3,
    trendSensitivity: 0.2,
    eventSensitivity: 0.85,
  },
  {
    id: "lamb-chops",
    name: "Sam Spade’s Lamb Chops",
    station: "Grill",
    orderShare: 0.12,
    unit: "portions",
    unitCost: 20,
    baselinePar: 18,
    weatherSensitivity: 0.2,
    trendSensitivity: 0.2,
    eventSensitivity: 0.8,
  },
  {
    id: "ribeye",
    name: "Ribeye Steak",
    station: "Grill",
    orderShare: 0.16,
    unit: "portions",
    unitCost: 22,
    baselinePar: 22,
    weatherSensitivity: 0.25,
    trendSensitivity: 0.2,
    eventSensitivity: 0.85,
  },
  {
    id: "filet-mignon",
    name: "Filet Mignon",
    station: "Grill",
    orderShare: 0.14,
    unit: "portions",
    unitCost: 25,
    baselinePar: 20,
    weatherSensitivity: 0.25,
    trendSensitivity: 0.2,
    eventSensitivity: 0.85,
  },
  {
    id: "lobster-ravioli",
    name: "Maine Lobster Ravioli",
    station: "Pasta",
    orderShare: 0.13,
    unit: "portions",
    unitCost: 9,
    baselinePar: 20,
    weatherSensitivity: 0.5,
    trendSensitivity: 0.5,
    eventSensitivity: 0.9,
  },
  {
    id: "clam-chowder",
    name: "New England Clam Chowder",
    station: "Soups",
    orderShare: 0.22,
    unit: "portions",
    unitCost: 4,
    baselinePar: 31,
    weatherSensitivity: -0.6,
    trendSensitivity: 0.3,
    eventSensitivity: 0.85,
  },
];

export function scenarioMenuForVenue(placeId: string): MenuItem[] | null {
  return placeId === JOHNS_GRILL_PLACE_ID
    ? JOHNS_GRILL_SCENARIO_MENU.map((item) => ({ ...item }))
    : null;
}
