/* ==========================================================================
   brand-lockup.mjs — the Frontira brand identity laws, as code (#60).

   The rule this file exists to make checkable, in one sentence: INSIDE AN
   IDENTITY SLOT THE NAME IS A DRAWING. Text spelling "frontira" in that slot
   is an approximation of the wordmark however carefully it is set, and the
   observed failure was exactly that — the official F lettermark beside a
   typeset name, presented as the identity.

   Prose is untouched. Running copy may write the name as often as it likes;
   that is the writing contract's business. The distinction is the slot:
   prose NAMES the company, an identity slot IS the company.

   Note what is absent. There is no mark-plus-wordmark lockup, because the F
   mark is the wordmark's own first glyph — both measure an identical 14.87%
   monoline stroke — so composing them would set the same F twice. The lockup
   is the wordmark asset over the CVP instead.

     import { lockupFor } from '@frontira/design-system/brand-lockup';
   ========================================================================== */

/* Manifests in this system carry $comment keys for the reasoning behind each
   block. They are documentation, not entries, so every walk skips them. */
const entries = (obj) => Object.entries(obj ?? {}).filter(([k]) => !k.startsWith('$'));

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ── manifest laws ───────────────────────────────────────────────────────── */
export function validateBrandManifest(manifest) {
  const problems = [];
  const m = manifest ?? {};

  for (const v of ['mark', 'wordmark', 'lockup']) {
    if (!m.variants?.[v]) problems.push(`#60 names a ${v} variant; the contract must define it`);
  }
  if (m.variants?.mark?.carriesName) {
    problems.push('the lettermark does not say the company name — claiming it does is what lets a mark stand in for the identity');
  }
  if (!m.variants?.wordmark?.carriesName) {
    problems.push('the wordmark is the name; a contract that says otherwise has nothing left to require');
  }
  if (m.variants?.lockup?.assetPart !== 'wordmark') {
    problems.push('the lockup takes its NAME from the official asset — a lockup whose name is typeset is the defect #60 was filed about');
  }
  if (m.typesetApproximation?.forbidden !== true) {
    problems.push('typeset approximations are forbidden, or the contract permits the thing it exists to prevent');
  }
  if (m.typesetApproximation?.proseIsFine !== true) {
    problems.push('the rule is about identity SLOTS; forbidding the name in prose would ban the company from writing its own name');
  }
  if (m.typesetApproximation?.detection !== 'geometry-hash') {
    problems.push('an approximation is caught by comparing geometry, not by trusting a filename');
  }
  if ((m.contrast?.floor ?? 0) < 4.5) {
    problems.push('the identity is read rather than glanced at, so it holds the 4.5:1 text floor, not the 3:1 graphical one');
  }
  if (m.brand?.cvpAlwaysEnglish !== true) {
    problems.push('the CVP is a claim, not a sentence, and a claim that changes shape per market is not a claim');
  } else if (m.brand?.cvpLanguage !== 'en') {
    /* Without this the flag is decorative: translating the CVP and its lang
       together moves the expectation the rendered check compares against, so
       a German edition would pass while claiming to be always-English. */
    problems.push(`cvpAlwaysEnglish is set but the CVP is marked "${m.brand?.cvpLanguage}" — the flag has to bind the actual language or it checks nothing`);
  }
  if (m.accessibility?.decorativeAllowed) {
    problems.push('a logo exposed as decorative tells a screen reader the page belongs to nobody');
  }

  /* Every surface must be decidable: a surface whose allowed set is empty, or
     that requires a name while only allowing the mark, cannot be satisfied. */
  for (const [name, s] of entries(m.surfaces)) {
    const allowed = s.allowed ?? [];
    if (!allowed.length) problems.push(`surface ${name} allows no variant at all`);
    for (const v of allowed) {
      if (!m.variants?.[v]) problems.push(`surface ${name} allows unknown variant ${v}`);
    }
    if (s.requires === 'name' && !allowed.some((v) => m.variants?.[v]?.carriesName)) {
      problems.push(`surface ${name} requires the name but allows no variant that carries it`);
    }
    if (s.requires === 'mark' && allowed.some((v) => m.variants?.[v]?.carriesName)) {
      problems.push(`surface ${name} is a compact slot; allowing ${allowed.join('/')} there is how a wordmark ends up clipped`);
    }
  }

  const floor = m.geometry?.hardFloorPx ?? 0;
  for (const [name, v] of entries(m.variants)) {
    if ((v.minHeightPx ?? 0) < floor) {
      problems.push(`variant ${name} allows ${v.minHeightPx}px, below the measured ${floor}px floor where the stroke breaks`);
    }
  }
  return problems;
}

/* ── the deterministic decision ───────────────────────────────────────────
   The acceptance criterion: header/footer and compact-icon choices come out
   of the contract rather than out of a judgement call. */
export function variantFor(surface, manifest, preferred = null) {
  const s = manifest?.surfaces?.[surface];
  if (!s) {
    throw new Error(`unknown brand surface "${surface}" — the contract lists ${entries(manifest?.surfaces).map(([k]) => k).join(', ')}`);
  }
  if (preferred) {
    if (!s.allowed.includes(preferred)) {
      throw new Error(`${surface} does not allow the ${preferred} variant`
        + (s.requires === 'name' ? ' — this surface must carry the company name' : ' — this surface is a compact slot')
        + `; allowed: ${s.allowed.join(', ')}`);
    }
    return preferred;
  }
  return s.allowed[0];
}

export function surfacesFor(variant, manifest) {
  return entries(manifest?.surfaces)
    .filter(([, s]) => (s.allowed ?? []).includes(variant)).map(([name]) => name);
}

/* ── the approximation detector ───────────────────────────────────────────
   Given the text content of an identity slot, does it spell the brand name?
   Deliberately generous about how: spacing, casing, and interleaved markup
   all normalise away, because an approximation set as "F R O N T I R A" is
   still an approximation. */
export function readsAsBrandName(text, manifest) {
  const canonical = (manifest?.brand?.canonical ?? 'frontira').toLowerCase();
  const flat = String(text ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return flat.includes(canonical);
}

/* ── the identity itself ──────────────────────────────────────────────────── */
export function validateLockup({ surface, variant = null, heightPx = null } = {}, manifest) {
  const problems = [];
  let resolved;
  try {
    resolved = variantFor(surface, manifest, variant);
  } catch (err) {
    return [err.message];
  }
  const spec = manifest.variants[resolved];
  if (heightPx != null && heightPx < spec.minHeightPx) {
    problems.push(`${resolved} at ${heightPx}px is below its ${spec.minHeightPx}px minimum`
      + (heightPx < manifest.geometry.hardFloorPx ? ` and below the ${manifest.geometry.hardFloorPx}px floor where the stroke itself breaks` : ''));
  }
  return problems;
}

/* ── emission ─────────────────────────────────────────────────────────────
   Consumers get the identity without reimplementing brand geometry, which is
   the third acceptance criterion. The SVG is inlined by the caller from the
   shipped asset; this emits the slot, its attributes and the CVP. */
export function lockupFor({ surface, variant = null, heightPx = null, decorative = false } = {}, manifest) {
  const problems = validateLockup({ surface, variant, heightPx }, manifest);
  if (problems.length) throw new Error(`illegal brand lockup:\n  ${problems.join('\n  ')}`);

  const resolved = variantFor(surface, manifest, variant);
  const spec = manifest.variants[resolved];
  const height = heightPx ?? spec.minHeightPx;

  const attributes = {
    'data-brand': resolved,
    'data-surface': surface,
    style: `--brand-height: ${height}px`,
    ...(decorative ? { 'aria-hidden': 'true' } : {}),
  };

  /* The asset is referenced, never redrawn. A caller that wants it inline
     substitutes the shipped file into the placeholder, and the rendered check
     verifies the geometry that lands there hashes to the official one. */
  const assetSlot = `<span class="lg-brand-asset" data-asset="${resolved === 'lockup' ? 'wordmark' : resolved}"></span>`;

  const cvp = resolved === 'lockup'
    ? `\n  <span class="lg-brand-cvp" lang="${manifest.brand.cvpLanguage}">${esc(manifest.brand.cvp)}</span>`
    : '';

  return {
    variant: resolved,
    height,
    attributes,
    html: `<span class="lg-brand"${Object.entries(attributes).map(([k, v]) => ` ${k}="${v}"`).join('')}>\n  ${assetSlot}${cvp}\n</span>`,
  };
}
