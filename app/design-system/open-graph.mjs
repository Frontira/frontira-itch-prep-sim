/* ==========================================================================
   open-graph.mjs — the Open Graph contract, as code (#58, #72).

   WHY THIS EXISTS
   ---------------
   OPEN_GRAPH_GUIDE.md and assets/open-graph/contract.json both existed, and
   were both correct, while the David whitelabel scaffold typeset an
   approximate F instead of using the official lettermark. That violation
   shipped into every provisioned repo and survived for weeks, until a human
   happened to look at a Discord embed on 2026-08-04.

   Nothing was missing from the contract. What was missing was a way to RUN
   it. Prose cannot fail a build, and a JSON file that no code reads is prose
   with punctuation. #37 already taught this repo half the lesson — the same
   contract shipped on the default branch with no package export, so no
   consumer could even resolve it, which is what check-package-surface.mjs
   exists to prevent. This is the other half: a consumer can now resolve the
   contract AND execute it.

   PURE, and that is the whole design. No fs, no DOM, no network: the contract
   and the thing being checked are both passed in. That is what lets a
   consuming repo import this into its own CI without adopting this repo's
   toolchain, what lets David vendor it into a generated scaffold, and what
   makes every rule below mutation-testable in a plain node process.

   EVERY FINDING NAMES A CONTRACT RULE. A failure reading "og:image:alt is 184
   characters, the contract's content.altText.maxCharacters is 160" sends a
   consumer to the clause they broke. "Open Graph check failed" sends them
   here to read the source. The rule id is the path into contract.json, so the
   message and the machine-readable contract can never drift apart.

   WHAT IS DELIBERATELY NOT ENFORCED
   ---------------------------------
   The guide states rules the JSON does not encode — that twitter title,
   description and image should mirror their og counterparts, and that a
   production origin beats a localhost fallback. This module enforces the
   contract as written rather than inventing rule ids that no consumer could
   look up. Encoding those in contract.json is a contract change with a
   version surface, and belongs to whoever makes it, not to the checker.

   Two things also stay out of reach by construction: whether text sits inside
   the safe area, and whether the composition reads at chat size. Those are
   claims about a rendered image. The guide's review checklist owns them, and
   says so.
   ========================================================================== */

import { readsAsBrandName } from './brand-lockup.mjs';

export const CONTRACT_VERSION_MAJOR = 1;

/* A finding is { rule, message } and nothing else. `rule` is the dotted path
   into contract.json that was broken, so it is greppable from both sides. */
const finding = (rule, message) => ({ rule, message });

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value ?? ''));
const text = (value) => String(value ?? '').trim();

/* ── the contract document itself ────────────────────────────────────────
   Ordinary schema checks, plus the one that matters most: a contract may not
   permit the thing it exists to prevent. brand-lockup.mjs makes the same
   assertion about its own manifest, for the same reason — #60 and the embed
   that started #72 are the same failure, and a contract edited to allow an
   approximation would silence this module rather than fix anything. */
export function validateOpenGraphContract(contract) {
  const problems = [];
  const push = (rule, message) => problems.push(finding(rule, message));

  if (!contract || typeof contract !== 'object') {
    return [finding('contract', 'the contract is not an object — nothing can be checked against it')];
  }
  if (contract.schemaVersion !== CONTRACT_VERSION_MAJOR) {
    push('schemaVersion', `this module implements contract v${CONTRACT_VERSION_MAJOR}, the document declares v${contract.schemaVersion}`);
  }

  const canvas = contract.canvas ?? {};
  for (const axis of ['width', 'height']) {
    if (!Number.isInteger(canvas[axis]) || canvas[axis] <= 0) {
      push(`canvas.${axis}`, `canvas.${axis} is ${canvas[axis]}, which is not a positive whole number of pixels`);
    }
  }
  const safe = canvas.safeArea ?? {};
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    if (!Number.isFinite(safe[edge]) || safe[edge] < 0) {
      push(`canvas.safeArea.${edge}`, `canvas.safeArea.${edge} is ${safe[edge]}`);
    }
  }
  if (Number.isFinite(safe.left) && Number.isFinite(safe.right) && Number.isInteger(canvas.width)
    && safe.left + safe.right >= canvas.width) {
    push('canvas.safeArea', `the horizontal safe margins (${safe.left} + ${safe.right}) leave no canvas between them`);
  }
  if (Number.isFinite(safe.top) && Number.isFinite(safe.bottom) && Number.isInteger(canvas.height)
    && safe.top + safe.bottom >= canvas.height) {
    push('canvas.safeArea', `the vertical safe margins (${safe.top} + ${safe.bottom}) leave no canvas between them`);
  }

  const brandAsset = contract.content?.brandAsset ?? {};
  if (brandAsset.allowTypesetApproximation !== false) {
    push('content.brandAsset.allowTypesetApproximation',
      'the contract permits a typeset approximation of the lettermark — that is the violation this contract was written to stop');
  }
  if (!text(brandAsset.lettermark) || !text(brandAsset.wordmark)) {
    push('content.brandAsset', 'the contract names no official lettermark or wordmark asset, so "use the official asset" is unenforceable');
  }
  /* The repo-relative path is what the design system sees; the package export
     is what a consumer can actually import. A contract that names only the
     first cannot be checked in the repo that violates it — which is the
     shape of failure #72 was filed about, one level up. */
  if (!text(brandAsset.lettermarkExport) || !text(brandAsset.wordmarkExport)) {
    push('content.brandAsset', 'the contract names no package export for the brand assets, so a consumer cannot reference the official asset by any name this checker knows');
  }
  if (!text(contract.content?.brand)) {
    push('content.brand', 'the contract names no written brand, so the lettermark pairing rule cannot be checked');
  }

  for (const slot of ['title', 'descriptor', 'kicker', 'altText']) {
    const spec = contract.content?.[slot];
    if (spec && spec.maxCharacters != null && (!Number.isInteger(spec.maxCharacters) || spec.maxCharacters <= 0)) {
      push(`content.${slot}.maxCharacters`, `content.${slot}.maxCharacters is ${spec.maxCharacters}`);
    }
  }

  const required = contract.metadata?.required;
  if (!Array.isArray(required) || required.length === 0) {
    push('metadata.required', 'the contract requires no metadata at all');
  }
  if (!text(contract.metadata?.openGraphType)) push('metadata.openGraphType', 'no og:type is specified');
  if (!text(contract.metadata?.twitterCard)) push('metadata.twitterCard', 'no twitter:card is specified');

  return problems;
}

/* ── reading a page's head ───────────────────────────────────────────────
   Consumers hand over whatever they have. A framework that knows its own
   metadata object passes a plain map; a deployed-page check passes the HTML
   it fetched. Both arrive here as the same map.

   The parse is deliberately small: <meta> keyed by property or name, plus the
   canonical <link>. It is not an HTML parser and does not want to be — it
   reads a head that a build tool wrote, not arbitrary markup. */
const TAG = /<(meta|link)\b([^>]*?)\/?>/gi;
const ATTR = /([a-zA-Z][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

export function readMetaTags(html) {
  const tags = {};
  for (const [, kind, rawAttributes] of String(html ?? '').matchAll(TAG)) {
    const attributes = {};
    for (const [, name, dq, sq, bare] of rawAttributes.matchAll(ATTR)) {
      attributes[name.toLowerCase()] = dq ?? sq ?? bare ?? '';
    }
    if (kind.toLowerCase() === 'meta') {
      const key = attributes.property ?? attributes.name;
      if (key && attributes.content != null) tags[key] = attributes.content;
    } else if ((attributes.rel ?? '').toLowerCase().split(/\s+/).includes('canonical')) {
      if (attributes.href != null) tags.canonical = attributes.href;
    }
  }
  return tags;
}

/* ── the metadata a page emits ───────────────────────────────────────────
   `input` is either the page's HTML or an already-resolved tag map. */
export function checkMetadata(input, contract, { where = 'the page head' } = {}) {
  const problems = [];
  const push = (rule, message) => problems.push(finding(rule, `${where}: ${message}`));
  const tags = typeof input === 'string' ? readMetaTags(input) : { ...(input ?? {}) };

  for (const key of contract.metadata?.required ?? []) {
    if (!text(tags[key])) push('metadata.required', `${key} is missing or empty, and the contract requires it`);
  }

  const type = contract.metadata?.openGraphType;
  if (type && text(tags['og:type']) && tags['og:type'] !== type) {
    push('metadata.openGraphType', `og:type is "${tags['og:type']}", the contract says "${type}"`);
  }
  const card = contract.metadata?.twitterCard;
  if (card && text(tags['twitter:card']) && tags['twitter:card'] !== card) {
    push('metadata.twitterCard', `twitter:card is "${tags['twitter:card']}", the contract says "${card}"`);
  }

  if (contract.metadata?.absoluteUrls) {
    for (const key of ['canonical', 'og:url', 'og:image', 'twitter:image']) {
      const value = text(tags[key]);
      if (value && !isAbsoluteUrl(value)) {
        push('metadata.absoluteUrls', `${key} is "${value}" — the contract requires an absolute URL, because a preview is fetched by a crawler that has no page to resolve against`);
      }
    }
  }

  /* The canvas is a metadata claim as well as a rendering one: a crawler
     believes og:image:width before it downloads anything. */
  for (const [key, expected] of [['og:image:width', contract.canvas?.width], ['og:image:height', contract.canvas?.height]]) {
    const value = text(tags[key]);
    if (value && expected != null && Number(value) !== expected) {
      push('canvas', `${key} is ${value}, the contract's canvas is ${contract.canvas.width}x${contract.canvas.height}`);
    }
  }

  /* Alt text is the one content cap that lives in metadata rather than in the
     composition, so it is the one this function owns. */
  const alt = contract.content?.altText ?? {};
  const altValue = text(tags['og:image:alt']);
  if (alt.required && !altValue) {
    push('content.altText.required', 'og:image:alt is empty — alt text describes the composition, and the contract requires it');
  }
  if (altValue && alt.maxCharacters != null && altValue.length > alt.maxCharacters) {
    push('content.altText.maxCharacters', `og:image:alt is ${altValue.length} characters, the contract's cap is ${alt.maxCharacters}`);
  }

  return problems;
}

/* ── the composition that draws the image ────────────────────────────────
   This is the half that would have caught #72's violation. The scaffold's
   opengraph-image source is text; the question is whether it reaches for the
   official asset or draws its own.

   `content` is optional and holds the strings the composition typesets. A
   scaffold knows them, so it can hand them over and get the character caps
   checked. They are NOT read off the metadata tags: the guide is explicit
   that og:title need not repeat the image's title verbatim, so capping one by
   the other's rule would fail pages that are following the contract. */
export function checkComposition(source, contract, { where = 'the composition source', content = null } = {}) {
  const problems = [];
  const push = (rule, message) => problems.push(finding(rule, `${where}: ${message}`));
  const code = String(source ?? '');
  const brandAsset = contract.content?.brandAsset ?? {};

  /* An asset counts as referenced by the package export a consumer imports,
     by the repo-relative path the contract states, or by either one's bare
     filename — so the rule holds whether the consumer imports from the
     package, copies the file into public/, or inlines it through a bundler.
     Every accepted name comes from the contract; none is kept here. */
  const basename = (value) => String(value ?? '').split('/').pop();
  const names = (...declared) => {
    const set = new Set();
    for (const value of declared) {
      const declaredText = text(value);
      if (!declaredText) continue;
      set.add(declaredText);
      set.add(basename(declaredText));
    }
    return [...set];
  };
  const lettermarkNames = names(brandAsset.lettermarkExport, brandAsset.lettermark);
  const wordmarkNames = names(brandAsset.wordmarkExport, brandAsset.wordmark);
  const usesLettermark = lettermarkNames.some((name) => code.includes(name));
  const usesWordmark = wordmarkNames.some((name) => code.includes(name));

  if (brandAsset.required && !usesLettermark && !usesWordmark) {
    push('content.brandAsset.required',
      `no official brand asset is referenced — the contract names ${[...lettermarkNames, ...wordmarkNames].join(', ') || '(none)'}, and a preview without one is unbranded or hand-drawn`);
  }

  /* The approximation itself. A text node whose entire content is a lone F is
     the shape of a typeset lettermark; that is what shipped into every
     provisioned repo. Checked even when an official asset IS referenced,
     because the observed failure was a correct import sitting beside a drawn
     one. */
  if (brandAsset.allowTypesetApproximation === false) {
    const loneLetter = /(?:>\s*([Ff])\s*<)|(?:^|[\s([{,=])(["'`])([Ff])\2/g;
    if (loneLetter.test(code)) {
      push('content.brandAsset.allowTypesetApproximation',
        `a lone "F" is typeset as text — the contract forbids approximating the lettermark, use ${lettermarkNames[0] || "the official asset"}`);
    }
  }

  /* "When the lettermark is used, pair it with the lowercase written brand
     name" — prose in the guide, a boolean in the contract, and until now
     nothing in between. readsAsBrandName is reused from the brand lockup so
     that "F R O N T I R A" does not read as compliance here while failing
     there. */
  if (brandAsset.pairLettermarkWithBrandName && usesLettermark && !usesWordmark) {
    const brand = contract.content?.brand;
    /* The name has to appear as CONTENT, not inside a module path. Every
       import from this package spells "frontira" in its own specifier, so
       testing the raw source would let a bare lettermark pass by virtue of
       the line that imported it — the rule would read as enforced and catch
       nothing, which is the failure mode this whole issue is about. Module
       specifiers and any path- or scope-shaped string come out first; JSX
       text nodes, which is where a rendered name actually lives, stay. */
    const rendered = code
      .replace(/\bimport\s[\s\S]*?\sfrom\s*(['"`])[^'"`]*\1/g, ' ')
      .replace(/\b(?:import|require)\s*\(\s*(['"`])[^'"`]*\1\s*\)/g, ' ')
      .replace(/(['"`])[^'"`\n]*[\/@][^'"`\n]*\1/g, ' ');
    if (brand && !readsAsBrandName(rendered, { brand: { canonical: brand } })) {
      push('content.brandAsset.pairLettermarkWithBrandName',
        `the lettermark appears without the written brand name "${brand}" — the mark alone does not say who this is`);
    }
  }

  for (const slot of ['title', 'descriptor', 'kicker']) {
    const spec = contract.content?.[slot];
    const value = content?.[slot];
    if (spec?.maxCharacters != null && typeof value === 'string' && value.length > spec.maxCharacters) {
      push(`content.${slot}.maxCharacters`,
        `the ${slot} is ${value.length} characters, the contract's cap is ${spec.maxCharacters}`);
    }
  }

  return problems;
}

/* ── reporting ───────────────────────────────────────────────────────────── */
export function formatFindings(findings) {
  return findings.map(({ rule, message }) => `  ✗ [${rule}] ${message}`).join('\n');
}

/**
 * One call for a consumer's CI. Checks whatever it is given — the contract
 * document, a page head, a composition source — and throws once, naming every
 * rule that was broken. Returns the findings when `throwOnFailure` is false,
 * for callers that want to report them their own way.
 */
export function assertOpenGraph({
  contract,
  html = null,
  tags = null,
  composition = null,
  content = null,
  where = {},
  throwOnFailure = true,
} = {}) {
  const findings = [
    ...validateOpenGraphContract(contract),
    ...(html != null || tags != null
      ? checkMetadata(html ?? tags, contract, { ...(where.metadata ? { where: where.metadata } : {}) })
      : []),
    ...(composition != null
      ? checkComposition(composition, contract, { content, ...(where.composition ? { where: where.composition } : {}) })
      : []),
  ];
  if (findings.length && throwOnFailure) {
    throw new Error(
      `Open Graph contract ${contract?.id ?? '(unidentified)'} violated by ${findings.length} rule(s):\n`
      + `${formatFindings(findings)}\n\nThe contract is @frontira/design-system/open-graph-contract; the prose is OPEN_GRAPH_GUIDE.md.`,
    );
  }
  return findings;
}
