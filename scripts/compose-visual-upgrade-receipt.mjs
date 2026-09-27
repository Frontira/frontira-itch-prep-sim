import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const [beforeArg, afterArg, outputArg] = process.argv.slice(2);
if (!beforeArg || !afterArg || !outputArg) {
  throw new Error("usage: compose-visual-upgrade-receipt <before-root> <after-root> <output-dir>");
}

const beforeRoot = path.resolve(beforeArg);
const afterRoot = path.resolve(afterArg);
const outputDir = path.resolve(outputArg);
const readJson = async (root, file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const beforeResult = await readJson(
  beforeRoot,
  "artifacts/visual-acceptance/acceptance-result.json",
);
const afterResult = await readJson(afterRoot, "artifacts/visual-acceptance/acceptance-result.json");
const beforeContract = await readJson(beforeRoot, "visual-acceptance.json");
const afterContract = await readJson(afterRoot, "visual-acceptance.json");
const beforeProvenance = await readJson(beforeRoot, "design-system.lock.json");
const afterProvenance = await readJson(afterRoot, "design-system.lock.json");

if (!beforeResult.passed || !afterResult.passed) {
  throw new Error("Both visual acceptance runs must pass before composing an upgrade receipt.");
}
if (JSON.stringify(beforeResult.captures) !== JSON.stringify(afterResult.captures)) {
  throw new Error("The before and after visual contracts do not produce matching captures.");
}

const beforeBaseline = beforeContract.baseline ?? null;
const afterBaseline = afterContract.baseline ?? null;
let baselineHandling = { changed: false, acknowledgement: null };
if (JSON.stringify(beforeBaseline) !== JSON.stringify(afterBaseline)) {
  let acknowledgement;
  try {
    acknowledgement = await readJson(afterRoot, "visual-baseline-update.json");
  } catch {
    throw new Error(
      "The profile baseline changed without visual-baseline-update.json acknowledgement.",
    );
  }
  if (
    acknowledgement.acknowledged !== true ||
    typeof acknowledgement.reason !== "string" ||
    acknowledgement.reason.trim().length < 8 ||
    JSON.stringify(acknowledgement.from ?? null) !== JSON.stringify(beforeBaseline) ||
    JSON.stringify(acknowledgement.to ?? null) !== JSON.stringify(afterBaseline)
  ) {
    throw new Error("visual-baseline-update.json does not explicitly acknowledge this change.");
  }
  baselineHandling = { changed: true, acknowledgement };
}

await mkdir(outputDir, { recursive: true });
const rows = [];
for (const capture of beforeResult.captures) {
  const beforeSource = path.join(beforeRoot, "artifacts/visual-acceptance", capture);
  const afterSource = path.join(afterRoot, "artifacts/visual-acceptance", capture);
  const beforeName = `before-${capture}`;
  const afterName = `after-${capture}`;
  await copyFile(beforeSource, path.join(outputDir, beforeName));
  await copyFile(afterSource, path.join(outputDir, afterName));
  rows.push({ capture, beforeName, afterName });
}

const receipt = {
  schemaVersion: 1,
  passed: true,
  buildSuccessIsVisualApproval: false,
  before: { provenance: beforeProvenance, result: beforeResult },
  after: { provenance: afterProvenance, result: afterResult },
  baselineHandling,
  captures: rows,
};
await writeFile(
  path.join(outputDir, "upgrade-receipt.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);

const images = await Promise.all(
  rows.flatMap((row) =>
    [row.beforeName, row.afterName].map(async (name) => ({
      name,
      data: (await readFile(path.join(outputDir, name))).toString("base64"),
    })),
  ),
);
const encoded = new Map(images.map((image) => [image.name, image.data]));
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; padding: 32px; background: #0a0a0a; color: #f5f5f5; font: 16px sans-serif; }
  header { margin-bottom: 24px; } h1 { margin: 0 0 8px; } p { color: #bdbdbd; }
  section { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 28px; }
  figure { margin: 0; padding: 12px; background: #171717; border: 1px solid #333333; }
  img { display: block; width: 100%; height: auto; } figcaption { padding-top: 10px; }
</style><header><h1>Visual upgrade receipt</h1><p>Automated evidence only. Human visual approval remains required.</p></header>${rows
  .map(
    (row) => `<h2>${row.capture}</h2><section>
      <figure><img src="data:image/png;base64,${encoded.get(row.beforeName)}"><figcaption>Before</figcaption></figure>
      <figure><img src="data:image/png;base64,${encoded.get(row.afterName)}"><figcaption>After</figcaption></figure>
    </section>`,
  )
  .join("")}`;
await writeFile(path.join(outputDir, "upgrade-contact-sheet.html"), html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: path.join(outputDir, "upgrade-contact-sheet.png"),
    fullPage: true,
  });
} finally {
  await browser.close();
}
