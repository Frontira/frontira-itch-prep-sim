/* ==========================================================================
   atmosphere.mjs — the application atmosphere grammar as code (#62).

   A page names a SECTION JOB and a CARRIER; this module says whether the
   pairing is legal, and turns a legal request into markup. Consumers never
   copy a gradient, an SVG path or a palette value: the CSS ships as
   @frontira/design-system/app-atmosphere, the terrain ships as a committed
   asset with its seed receipt, and this file is the one place the laws live
   as executable checks rather than prose.

   PURE ON PURPOSE. No filesystem, no randomness, no DOM. The manifest and the
   committed assets are passed in, so a generated project (David) can vendor
   the package and call these functions in its own build without inheriting
   any of this repo's tooling. The same purity is what lets validateManifest
   run at map load with no browser — every law here is arithmetic on data.
   ========================================================================== */

export const MANIFEST_VERSION_MAJOR = 1;

const TIER_NAMES = ['quiet', 'section', 'focal'];

/* ── validateManifest ────────────────────────────────────────────────────
   Structural laws of the grammar itself. A manifest that fails here is not a
   weaker grammar, it is a different and unratified one. */
export function validateManifest(manifest) {
  const problems = [];
  const carriers = manifest.carriers ?? {};
  const sections = manifest.sections ?? {};

  /* The ratified aurora governance, held as data: ONE aurora per page,
     hero-level only. Loosening it is a decision someone takes in review,
     not a drift. */
  const auroraSections = carriers.aurora?.sections ?? [];
  if (auroraSections.length !== 1 || auroraSections[0] !== 'hero') {
    problems.push(
      `carriers.aurora.sections is [${auroraSections.join(', ')}]; the ratified governance is ["hero"]. ` +
      'ONE aurora per page, hero-level only — amending that law is a review decision, not a manifest edit.',
    );
  }

  for (const [name, section] of Object.entries(sections)) {
    if (!section.allowed?.includes('none')) {
      problems.push(`sections.${name}.allowed omits "none". Restraint is always legal.`);
    }
    if (section.default !== 'none') {
      problems.push(
        `sections.${name}.default is "${section.default}". The default is the quietest legal choice, ` +
        'and the quietest choice is no carrier at all.',
      );
    }
    for (const carrier of section.allowed ?? []) {
      if (carrier !== 'none' && !carriers[carrier]) {
        problems.push(`sections.${name} allows "${carrier}", which is not a defined carrier`);
      }
    }
  }

  for (const [name, carrier] of Object.entries(carriers)) {
    if (manifest.reserved?.[name]) {
      problems.push(`carrier "${name}" is reserved: ${manifest.reserved[name]}`);
    }
    for (const sectionName of carrier.sections ?? []) {
      if (!sections[sectionName]) {
        problems.push(`carriers.${name} names unknown section "${sectionName}"`);
      } else if (!sections[sectionName].allowed?.includes(name)) {
        problems.push(
          `carriers.${name} claims section "${sectionName}" but sections.${sectionName}.allowed does not list it — ` +
          'the two tables disagree and neither can be trusted',
        );
      }
    }
    if (!['identical', 'frozen'].includes(carrier.staticState)) {
      problems.push(
        `carriers.${name}.staticState is "${carrier.staticState}"; it must be "identical" (never moves) or ` +
        '"frozen" (reduced motion leaves a complete composition). A carrier that cannot say what it looks ' +
        'like without motion has no static state.',
      );
    }
    if (carrier.motion === 'ambient' && carrier.staticState !== 'frozen') {
      problems.push(`carriers.${name} is ambient but staticState is not "frozen"`);
    }
    /* An ambient opt-in is a ratified recipe or it is a research specimen.
       The shipped default fields stay untouched — the opt-in carries its own
       frozen contract beside them. */
    if (carrier.ambientOptIn) {
      const optIn = carrier.ambientOptIn;
      if (optIn.staticState !== 'frozen' || !optIn.loop || !Array.isArray(optIn.durationsSeconds)) {
        problems.push(
          `carriers.${name}.ambientOptIn is incomplete — opt-in motion with no ratified recipe ` +
          'is a research specimen, not a carrier',
        );
      }
      if (optIn.countsAgainst !== 'animatedPerPage') {
        problems.push(`carriers.${name}.ambientOptIn must count against animatedPerPage — one budget, one ledger`);
      }
    }

    const tiers = carrier.tiers ?? [];
    if (!tiers.length || tiers.some((tier) => !TIER_NAMES.includes(tier))) {
      problems.push(`carriers.${name}.tiers must be a non-empty subset of ${TIER_NAMES.join('/')}`);
    }
  }

  for (const limit of ['perSurface', 'animatedPerPage', 'focalPerPage', 'consecutiveNonQuiet']) {
    if (!Number.isFinite(manifest.limits?.[limit])) {
      problems.push(`limits.${limit} is missing — an unstated budget is an unlimited one`);
    }
  }

  return problems;
}

/* ── validateComposition ─────────────────────────────────────────────────
   The page-level laws. `composition` is what a page declares, in order:
   [{ section: 'hero', carrier: 'aurora', tier: 'section' }, ...]. A section
   with no carrier is stated as carrier 'none' or by omitting the field —
   restraint needs no markup and no special case. */
export function validateComposition(composition, manifest) {
  const problems = [];
  const carriers = manifest.carriers ?? {};
  let animated = 0;
  let focal = 0;
  let consecutiveNonQuiet = 0;

  composition.forEach((entry, index) => {
    const at = `section ${index + 1} (${entry.section})`;
    const sectionDef = manifest.sections?.[entry.section];
    if (!sectionDef) {
      problems.push(`${at}: unknown section job "${entry.section}" (${Object.keys(manifest.sections ?? {}).join(' | ')})`);
      return;
    }
    const carrier = entry.carrier ?? 'none';
    if (carrier === 'none') { consecutiveNonQuiet = 0; return; }

    const carrierDef = carriers[carrier];
    if (!carrierDef) {
      const reserved = manifest.reserved?.[carrier];
      problems.push(reserved
        ? `${at}: carrier "${carrier}" is reserved — ${reserved}`
        : `${at}: unknown carrier "${carrier}" (${Object.keys(carriers).join(' | ')})`);
      return;
    }
    if (!sectionDef.allowed.includes(carrier)) {
      problems.push(
        `${at}: "${carrier}" is not a ${entry.section} carrier. Allowed here: ${sectionDef.allowed.join(', ')}. ` +
        'The background follows the section\'s job, not taste.',
      );
      return;
    }

    const tier = entry.tier ?? 'quiet';
    if (!carrierDef.tiers.includes(tier)) {
      problems.push(
        `${at}: "${carrier}" has no ${tier} tier (${carrierDef.tiers.join(', ')}). ` +
        (carrierDef.tiersNote ? carrierDef.tiersNote : 'Tiers are discrete, ratified geometries, not a dial.'),
      );
    }

    if (entry.breathe === true && !carrierDef.ambientOptIn) {
      problems.push(
        `${at}: "${carrier}" does not breathe — breathe: true is only legal on a carrier with a ` +
        'ratified ambientOptIn recipe',
      );
    }
    if (carrierDef.motion === 'ambient' || (carrierDef.ambientOptIn && entry.breathe === true)) animated += 1;
    if (tier === 'focal') focal += 1;
    consecutiveNonQuiet = tier === 'quiet' ? 0 : consecutiveNonQuiet + 1;
    if (consecutiveNonQuiet > manifest.limits.consecutiveNonQuiet) {
      problems.push(
        `${at}: ${consecutiveNonQuiet} consecutive non-quiet carriers. After ` +
        `${manifest.limits.consecutiveNonQuiet} the next section is plain or quiet — ` +
        'three loud sections in a row read as wallpaper, not as rhythm.',
      );
    }
  });

  if (animated > manifest.limits.animatedPerPage) {
    problems.push(
      `${animated} ambient carriers on one page; the budget is ${manifest.limits.animatedPerPage}. ` +
      'One ambient focal motion per viewport is the ceiling, not a starting bid.',
    );
  }
  if (focal > manifest.limits.focalPerPage) {
    problems.push(
      `${focal} focal sections on one page; the budget is ${manifest.limits.focalPerPage}. ` +
      'Focal means "the eye lands here" — two of them is none of them.',
    );
  }

  return problems;
}

/* ── atmosphereFor ───────────────────────────────────────────────────────
   A legal request becomes markup. Deterministic: same request, same assets,
   same string. `assets` carries the committed artwork so this module stays
   pure — { surveySvg: <contents of survey-041.svg>, provenance: <parsed
   survey-041.json> }. Returns { attributes, markup }:

     attributes  go on the SECTION element (data-ledger-section, the carrier
                 name, the tier) — the band carrier paints through these alone
     markup      the atmosphere child, or '' when the carrier is a surface
                 (band) or absent (none)                                    */
export function atmosphereFor(request, manifest, assets = {}) {
  const problems = validateComposition([request], manifest);
  if (problems.length) throw new Error(`atmosphere: ${problems[0]}`);

  const carrier = request.carrier ?? 'none';
  const tier = request.tier ?? 'quiet';
  const attributes = { 'data-ledger-section': request.section };
  if (carrier === 'none') return { attributes, markup: '' };

  attributes['data-ledger-atmosphere'] = carrier;
  attributes['data-tier'] = tier;

  if (carrier === 'band') return { attributes, markup: '' };

  const layer = (className, inner, extra = '') =>
    `<div class="${className}" data-ledger-atmosphere-layer aria-hidden="true"${extra}>${inner}</div>`;

  if (carrier === 'aurora') {
    return {
      attributes,
      markup: layer('lg-atm-aurora',
        '<span class="lg-atm-aurora-band"></span><span class="lg-atm-aurora-band"></span>' +
        '<span class="lg-atm-aurora-band"></span><span class="lg-atm-aurora-band"></span>'),
    };
  }

  if (carrier === 'survey') {
    if (!assets.surveySvg) {
      throw new Error(
        'atmosphere: the survey carrier needs assets.surveySvg — the contents of the committed ' +
        'assets/atmosphere/survey-041.svg. Geometry is never re-derived at a consumer build.',
      );
    }
    const clear = request.clear ?? 'bottom';
    const variants = manifest.carriers.survey.clearVariants;
    if (!variants.includes(clear)) {
      throw new Error(`atmosphere: survey has no clear variant "${clear}" (${variants.join(', ')})`);
    }
    return { attributes, markup: layer('lg-atm-survey', assets.surveySvg, ` data-clear="${clear}"`) };
  }

  if (carrier === 'grid') {
    return { attributes, markup: layer('lg-atm-grid', '') };
  }

  if (carrier === 'beacons') {
    const peaks = assets.provenance?.peaks;
    if (!peaks?.length) {
      throw new Error(
        'atmosphere: the beacons carrier needs assets.provenance — the parsed ' +
        'assets/atmosphere/survey-041.json. A light that does not stand on the terrain\'s own ' +
        'peak table is decoration.',
      );
    }
    /* Tone alternates deterministically; size follows the peak's own spread.
       When the composition opts into breathe, each light gets a cycle and a
       negative phase from its peak index — deterministic, so two builds of
       one page breathe identically — and the layer declares itself a loop
       host for the published offscreen-pause snippet. The summit light
       (i = 0) runs 7s with no phase: it leads the cycle. */
    const breathing = request.breathe === true;
    const beacons = peaks.map((peak, index) => {
      const cycle = 7 + ((index * 3) % 5);
      const breatheVars = breathing
        ? ` --lg-breathe-d: ${cycle}s; --lg-breathe-delay: -${((((index * 71) % 100) / 100) * cycle).toFixed(2)}s;`
        : '';
      return `<span class="lg-atm-beacon" data-tone="${index % 2 ? 'signal' : 'accent'}"` +
        ` style="left: ${(peak.x * 100).toFixed(2)}%; top: ${(peak.y * 100).toFixed(2)}%;` +
        ` width: ${(peak.spread * 200).toFixed(2)}%;${breatheVars}"></span>`;
    }).join('');
    return {
      attributes,
      markup: layer('lg-atm-beacons', beacons,
        breathing ? ' data-breathe data-ledger-motion-loop' : ''),
    };
  }

  throw new Error(`atmosphere: carrier "${carrier}" validated but has no emitter — this is a bug in atmosphere.mjs`);
}
