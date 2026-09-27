import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { findDirectIconProviderImports } = require("../app/design-system/iconography-policy.js");

const expected = {
  profileId: "frontira-ledger-4-8",
  applicationContract: 1,
  package: {
    name: "@frontira/design-system",
    version: "4.8.0",
    delivery: "vendored",
  },
  sourceCommit: "08da97cb8395556d2d7bcd42a5f0c9f45d120271",
  integrity: "sha256-87cbf70d41fc0c2cdce5289d876cd12ea885867e79631550338b8fd5fcdd8737",
};

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const lock = readJson("design-system.lock.json");
for (const [key, value] of Object.entries(expected)) {
  if (JSON.stringify(lock[key]) !== JSON.stringify(value)) {
    throw new Error(`design-system.lock.json has unexpected ${key}`);
  }
}

const snapshot = readJson("app/design-system/frontira-design-system.snapshot.json");
if (
  snapshot.version !== expected.package.version ||
  snapshot.sourceCommit !== expected.sourceCommit ||
  snapshot.integrity !== expected.integrity ||
  snapshot.contracts.application !== expected.applicationContract
) {
  throw new Error("Vendored design-system snapshot does not match the provenance lock");
}

const globals = readFileSync("app/globals.css", "utf8");
if (!globals.includes('@import "./design-system/app-components.css";')) {
  throw new Error("Frontira application components are not imported");
}
const componentCss = readFileSync("app/design-system/app-components.css", "utf8");
for (const cssImport of ["./pictograms.css", "./control-glyphs.css"]) {
  if (!componentCss.includes(`@import "${cssImport}";`)) {
    throw new Error(`Frontira application components are missing ${cssImport}`);
  }
}
const layout = readFileSync("app/layout.tsx", "utf8");
if (!layout.includes('className="lg-ink"')) {
  throw new Error("The root Ledger register is not lg-ink");
}

const manifest = readJson("app/design-system/app-components.json");
const glyphContract = manifest.glyphContract;
if (
  manifest.contractVersion !== 1 ||
  glyphContract?.family !== "Phosphor Regular 2.1.1" ||
  glyphContract?.domainSource !== "@frontira/design-system/pictograms" ||
  glyphContract?.controlSource !== "@frontira/design-system/control-glyphs" ||
  glyphContract?.providerImports !== "forbidden outside the governed adapter" ||
  JSON.stringify(glyphContract?.sizes) !== JSON.stringify([12, 16, 20]) ||
  glyphContract?.iconOnlyMinimumHitTarget !== 44
) {
  throw new Error("The vendored semantic glyph contract is invalid");
}

const pictograms = readJson("app/design-system/assets/pictograms/manifest.json");
const controls = readJson("app/design-system/assets/control-glyphs/manifest.json");
if (
  pictograms.version !== "1.1.0" ||
  Object.keys(pictograms.icons ?? {}).length !== 26 ||
  !("governance.approval" in (pictograms.icons ?? {})) ||
  controls.version !== "1.0.0" ||
  Object.keys(controls.glyphs ?? {}).length !== 18 ||
  !("control.disclosure" in (controls.glyphs ?? {}))
) {
  throw new Error("The vendored semantic icon manifests are incomplete");
}

for (const file of ["app/design-system/iconography.tsx", "components/ui/ledger-icon-slots.tsx"]) {
  if (!existsSync(file)) throw new Error(`Missing governed icon adapter: ${file}`);
}

const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const ignoredDirectories = new Set([".git", ".next", "artifacts", "node_modules"]);
const violations = [];

function inspectDirectory(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory)) {
    const file = path.join(directory, entry);
    const relative = file.split(path.sep).join("/");
    if (relative === "app/design-system" || relative.startsWith("app/design-system/")) continue;
    if (statSync(file).isDirectory()) {
      if (!ignoredDirectories.has(entry)) inspectDirectory(file);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry))) continue;
    for (const violation of findDirectIconProviderImports(readFileSync(file, "utf8"))) {
      violations.push(
        `${relative}:${violation.line}:${violation.column} imports ${violation.specifier}`,
      );
    }
  }
}

for (const root of ["app", "components", "lib"]) inspectDirectory(root);
if (violations.length > 0) {
  throw new Error(
    `Direct icon-provider imports are forbidden outside the Frontira adapter:
${violations.join("\n")}`,
  );
}

console.log("Frontira design-system profile and semantic iconography are intact");
