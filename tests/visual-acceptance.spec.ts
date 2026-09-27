import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  inspectVisualStructure,
  type SelectorState,
  type VisualContract,
  type VisualStructureSnapshot,
} from "../lib/visual-acceptance";
import contractJson from "../visual-acceptance.json";

type Contract = VisualContract & {
  viewports: Array<{ name: string; width: number; height: number }>;
  requiredAssets: string[];
  focusableSelector: string;
  contrastPairs: Array<{ foreground: string; background: string; minRatio: number }>;
  baseline: { directory: string } | null;
};

const contract = contractJson as Contract;
const artifactDir = path.resolve("artifacts/visual-acceptance");

async function waitForAssets(page: Page, errors: string[]): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map(
        (image) =>
          image.complete ||
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  });
  const failedAssets = await page.evaluate(async (assets) => {
    const failed: string[] = [];
    for (const asset of assets) {
      try {
        const response = await fetch(asset, { method: "GET" });
        if (!response.ok) failed.push(`${asset} (${response.status})`);
      } catch {
        failed.push(`${asset} (network error)`);
      }
    }
    return failed;
  }, contract.requiredAssets);
  errors.push(...failedAssets.map((asset) => `required asset failed: ${asset}`));
}

async function structureSnapshot(page: Page): Promise<VisualStructureSnapshot> {
  const selectors = [
    ...contract.registers.ink,
    ...contract.registers.paper,
    ...contract.registers.accent,
    ...contract.criticalLandmarks,
    ...contract.layers.map((layer) => layer.selector),
    ...contract.reducedMotionSelectors,
  ];
  return page.evaluate(
    ({ selectors, profileId }) => {
      const states: Record<string, SelectorState> = {};
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
          states[selector] = {
            exists: false,
            visible: false,
            opacity: 0,
            zIndex: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
            animationDurationMs: 0,
            transitionDurationMs: 0,
          };
          continue;
        }
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const parseDuration = (value: string) =>
          Math.max(
            0,
            ...value.split(",").map((entry) => {
              const duration = Number.parseFloat(entry);
              return entry.trim().endsWith("ms") ? duration : duration * 1000;
            }),
          );
        states[selector] = {
          exists: true,
          visible:
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number.parseFloat(style.opacity) > 0,
          opacity: Number.parseFloat(style.opacity),
          zIndex: Number.isNaN(Number.parseInt(style.zIndex, 10))
            ? 0
            : Number.parseInt(style.zIndex, 10),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          animationDurationMs: parseDuration(style.animationDuration),
          transitionDurationMs: parseDuration(style.transitionDuration),
        };
      }
      return {
        marker: document.documentElement.dataset.designProfile ?? null,
        rootClasses: [...document.documentElement.classList],
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        selectors: states,
        profileId,
      };
    },
    { selectors: [...new Set(selectors)], profileId: contract.profileId },
  );
}

function luminance([red, green, blue]: [number, number, number]): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function rgb(value: string): [number, number, number] | null {
  const match = value.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
  return match
    ? [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), Number.parseInt(match[3], 10)]
    : null;
}

async function checkContrast(page: Page, errors: string[]): Promise<void> {
  for (const pair of contract.contrastPairs) {
    const colors = await page.evaluate(({ foreground, background }) => {
      const foregroundElement = document.querySelector(foreground);
      const backgroundElement = document.querySelector(background);
      return foregroundElement && backgroundElement
        ? {
            foreground: getComputedStyle(foregroundElement).color,
            background: getComputedStyle(backgroundElement).backgroundColor,
          }
        : null;
    }, pair);
    const foreground = colors && rgb(colors.foreground);
    const background = colors && rgb(colors.background);
    if (!foreground || !background) {
      errors.push(`contrast pair could not be resolved: ${pair.foreground} / ${pair.background}`);
      continue;
    }
    const light = Math.max(luminance(foreground), luminance(background));
    const dark = Math.min(luminance(foreground), luminance(background));
    const ratio = (light + 0.05) / (dark + 0.05);
    if (ratio < pair.minRatio) {
      errors.push(
        `contrast ${ratio.toFixed(2)} is below ${pair.minRatio}: ${pair.foreground} / ${pair.background}`,
      );
    }
  }
}

async function checkKeyboardFocus(page: Page, errors: string[]): Promise<void> {
  if ((await page.locator(contract.focusableSelector).count()) === 0) return;
  await page.keyboard.press("Tab");
  const focus = await page.evaluate((selector) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.matches(selector)) return null;
    const style = getComputedStyle(active);
    return {
      tag: active.tagName.toLowerCase(),
      outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow !== "none",
    };
  }, contract.focusableSelector);
  if (!focus) errors.push("no generated interactive primitive was keyboard reachable");
  else if (!focus.outline && !focus.shadow) errors.push(`focus is not visible on ${focus.tag}`);
}

async function capture(
  browser: Browser,
  viewport: { name: string; width: number; height: number },
  reducedMotion: boolean,
): Promise<{ path: string; errors: string[] }> {
  const errors: string[] = [];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page error: ${error.message}`));
  page.on("requestfailed", (request) =>
    errors.push(`request failed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`),
  );

  await page.goto(contract.route, { waitUntil: "networkidle" });
  await waitForAssets(page, errors);
  errors.push(...inspectVisualStructure(contract, await structureSnapshot(page), reducedMotion));
  await checkContrast(page, errors);
  if (!reducedMotion) {
    const accessibility = await new AxeBuilder({ page }).analyze();
    errors.push(
      ...accessibility.violations
        .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
        .map((violation) => `accessibility: ${violation.id} (${violation.nodes.length} nodes)`),
    );
    await checkKeyboardFocus(page, errors);
  }

  const suffix = reducedMotion ? "reduced-motion" : viewport.name;
  const screenshotPath = path.join(artifactDir, `${suffix}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
  await context.close();
  return { path: screenshotPath, errors };
}

async function contactSheet(browser: Browser, screenshots: string[]): Promise<void> {
  const images = await Promise.all(
    screenshots.map(async (screenshot) => ({
      name: path.basename(screenshot),
      data: (await readFile(screenshot)).toString("base64"),
    })),
  );
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(`<style>
    body { margin: 0; padding: 32px; background: #0a0a0a; color: #f5f5f5; font: 16px sans-serif; }
    main { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
    figure { margin: 0; padding: 12px; background: #171717; border: 1px solid #333; }
    img { display: block; width: 100%; height: auto; }
    figcaption { padding-top: 10px; }
  </style><main>${images
    .map(
      (image) =>
        `<figure><img src="data:image/png;base64,${image.data}"/><figcaption>${image.name}</figcaption></figure>`,
    )
    .join("")}</main>`);
  await page.screenshot({ path: path.join(artifactDir, "contact-sheet.png"), fullPage: true });
  await page.close();
}

test("profile visual acceptance contract", async ({ browser }) => {
  await mkdir(artifactDir, { recursive: true });
  const captures: Array<{ path: string; errors: string[] }> = [];
  for (const viewport of contract.viewports) captures.push(await capture(browser, viewport, false));
  captures.push(await capture(browser, contract.viewports[0], true));
  await contactSheet(
    browser,
    captures.map((capture) => capture.path),
  );

  const errors = captures.flatMap((capture) => capture.errors);
  await writeFile(
    path.join(artifactDir, "acceptance-result.json"),
    `${JSON.stringify(
      {
        contractVersion: contract.contractVersion,
        profileId: contract.profileId,
        passed: errors.length === 0,
        buildSuccessIsVisualApproval: false,
        baseline: contract.baseline,
        captures: captures.map((capture) => path.basename(capture.path)),
        errors,
      },
      null,
      2,
    )}\n`,
  );
  expect(errors, errors.join("\n")).toEqual([]);
});
