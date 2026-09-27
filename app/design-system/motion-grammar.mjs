/* ==========================================================================
   motion-grammar.mjs — the application motion grammar as code (#56).

   A page has four motion registers: feedback, transition, entrance, and one
   narrative moment. This module owns the laws — which properties may animate
   where, the flow recipe's arithmetic, the ambient budget shared with the
   atmosphere grammar — and turns a legal flow request into markup.

   PURE ON PURPOSE. No filesystem, no DOM, no randomness: the manifest, the
   generated tokens and the rendered animation records are passed in. That is
   what lets a generated project (David) vendor the laws, and what lets every
   gate below be mutation-tested without a browser.

   Deliberately named motion-grammar: the motion/ directory is the HyperFrames
   VIDEO layer — one master clock, seekable, no wall time — and the two must
   not blur. This file governs in-page motion on the user's clock.
   ========================================================================== */

export const GRAMMAR_VERSION_MAJOR = 1;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── validateMotionManifest ──────────────────────────────────────────────
   The grammar's own structural laws. `deps` carries the two documents the
   manifest must agree with: { ledgerTokens, atmosphere }. */
export function validateMotionManifest(manifest, { ledgerTokens, atmosphere } = {}) {
  const problems = [];

  /* The manifest mirrors the generated tokens so a check can read one file;
     a mirror that drifts is worse than no mirror. */
  if (ledgerTokens?.motion) {
    for (const [key, entry] of Object.entries(manifest.tokens ?? {})) {
      const generated = ledgerTokens.motion[key];
      if (generated === undefined) {
        problems.push(`tokens.${key} has no counterpart in the generated motion group`);
        continue;
      }
      const stated = entry.ms !== undefined ? `${entry.ms}ms` : entry.value;
      if (String(generated) !== String(stated)) {
        problems.push(
          `tokens.${key} says ${stated} but tokens/generated/ledger-tokens.json says ${generated} — ` +
          'the manifest and the generated tokens disagree and neither can be trusted',
        );
      }
    }
  }

  const flow = manifest.flow ?? {};
  if (!(flow.stagesMin >= 3) || !(flow.stagesMax <= 6) || !(flow.stagesMin <= flow.stagesMax)) {
    problems.push(
      'flow.stagesMin/stagesMax must stay within 3..6 — two is a toggle and seven is a ' +
      'process diagram; neither is the loop',
    );
  }

  if (atmosphere && manifest.ambient?.perViewport !== atmosphere.limits?.animatedPerPage) {
    problems.push(
      `ambient.perViewport (${manifest.ambient?.perViewport}) disagrees with atmosphere.json ` +
      `limits.animatedPerPage (${atmosphere.limits?.animatedPerPage}) — one budget, two ledgers`,
    );
  }
  if (!(manifest.ambient?.minSeconds >= 7)) problems.push('ambient.minSeconds must be at least 7');
  if (manifest.ambient?.wholeSecondsOnly !== true) problems.push('ambient.wholeSecondsOnly must be true');

  /* The breathe token is the pinned centre of the ambient cycle family: a
     token nothing constrains is a near-dead fallback waiting to drift. */
  const breatheSeconds = (manifest.tokens?.breathe?.ms ?? 0) / 1000;
  const [cycleMin, cycleMax] = manifest.beacons?.durationsSeconds ?? [0, 0];
  if (!(breatheSeconds >= cycleMin && breatheSeconds <= cycleMax)) {
    problems.push(
      `tokens.breathe (${breatheSeconds}s) lies outside beacons.durationsSeconds ` +
      `[${cycleMin}, ${cycleMax}] — the token is the family's pinned centre, not a stray`,
    );
  }

  for (const [key, value] of Object.entries(manifest.limits ?? {})) {
    if (!Number.isFinite(value)) problems.push(`limits.${key} is missing — an unstated budget is an unlimited one`);
  }
  for (const limit of ['flowsPerPage', 'ambientPerViewport', 'headlineMotionDuringFlow']) {
    if (!(limit in (manifest.limits ?? {}))) {
      problems.push(`limits.${limit} is missing — an unstated budget is an unlimited one`);
    }
  }

  for (const exemption of manifest.exemptions ?? []) {
    const name = exemption.animation ?? exemption.transition ?? '(unnamed)';
    if (!exemption.allows?.length || !exemption.reason) {
      problems.push(`exemption "${name}" has no reason — a grandfather without a reason is a precedent`);
    }
  }

  const carrier = manifest.properties?.carrier ?? [];
  if (carrier.length !== 1 || carrier[0] !== 'transform') {
    problems.push('properties.carrier is not transform-only — a carrier that fades has no frozen state');
  }

  return problems;
}

/* ── validateFlow ────────────────────────────────────────────────────────
   A flow request: { stages: ['Observe','Decide','Act','Learn'], governed:
   'Governed, owned, in daily operation', settle: 'static', static: false }.
   Stage LABELS are never validated against a vocabulary: they are consumer
   content, which is what keeps Observe/Decide/Act/Learn a canonical example
   rather than a four-word widget nobody can reuse for Intake/Triage/Resolve. */
export function validateFlow(flow, manifest) {
  const problems = [];
  const { stagesMin, stagesMax } = manifest.flow;
  const n = flow.stages?.length ?? 0;
  if (n < stagesMin || n > stagesMax) {
    problems.push(`a flow is ${stagesMin} to ${stagesMax} stages (got ${n})`);
  }
  if ((flow.stages ?? []).some((stage) => typeof stage !== 'string' || !stage.trim())) {
    problems.push('every stage is a non-empty label');
  }
  if (typeof flow.governed !== 'string' || !flow.governed.trim()) {
    problems.push(
      'a flow ends on its governed line — the loop resolving into governed operation is the point, ' +
      'not an ornament',
    );
  }
  const settle = flow.settle ?? 'static';
  if (!manifest.flow.settle.includes(settle)) {
    problems.push(`settle is ${manifest.flow.settle.map((s) => `"${s}"`).join(' or ')} (got "${settle}")`);
  }
  return problems;
}

/* ── flowFor ─────────────────────────────────────────────────────────────
   A legal flow request becomes markup. Deterministic: same request, same
   string. The host element carries the attributes; the markup is its three
   children. Stage order is markup order — the CSS nth-child ladder indexes
   it, so consumer markup carries no counters. */
export function flowFor(flow, manifest) {
  const problems = validateFlow(flow, manifest);
  if (problems.length) throw new Error(`motion: ${problems[0]}`);

  const n = flow.stages.length;
  const attributes = {
    'data-ledger-motion': 'flow',
    'data-flow-stages': String(n),
    style: `--lg-flow-n: ${n}`,
    ...(flow.static ? { 'data-motion-static': '' } : {}),
  };
  const markup =
    '<div class="lg-flow-core" aria-hidden="true"></div>' +
    `<ol class="lg-flow-stages">${flow.stages.map((s) => `<li class="lg-flow-stage">${esc(s)}</li>`).join('')}</ol>` +
    `<p class="lg-flow-governed">${esc(flow.governed)}</p>`;
  return { attributes, markup };
}

/* ── classifyAnimations ──────────────────────────────────────────────────
   The rendered gate, as a pure function over records the in-page collector
   produced (scripts/lib/animation-law.mjs). Shared by check-app-motion and
   check-app-atmosphere so the two grammars cannot drift apart on what an
   animation is allowed to do.

   Record shape: { name, props: [], inLayer, carrier, breatheDeclared,
   inFlow, onHeadline, timing: { durationMs, delayMs, easing, iterations,
   direction } }. */
export function classifyAnimations(records, manifest) {
  const failures = [];
  const exempt = new Map(
    (manifest.exemptions ?? [])
      .filter((e) => e.animation)
      .map((e) => [e.animation, new Set(e.allows)]),
  );

  const loopHosts = new Set();

  for (const record of records) {
    const allowsOf = exempt.get(record.name) ?? new Set();

    /* Property law. Carriers are transform-only so the frozen state IS the
       composition; UI motion may also fade. */
    const legal = record.inLayer
      ? new Set(manifest.properties.carrier)
      : new Set(manifest.properties.ui);
    const offenders = record.props.filter(
      (p) => !legal.has(p) && !allowsOf.has(`property:${p}`),
    );
    if (offenders.length) {
      failures.push(record.inLayer
        ? `"${record.name}" animates ${offenders.join(', ')} on a carrier — carriers animate transform only`
        : `"${record.name}" animates ${offenders.join(', ')} — UI motion is transform and opacity, and a layout property is a reflow`);
    }

    /* Opt-in law: static beacons stay static. */
    if (record.inLayer && record.carrier === 'beacons' && !record.breatheDeclared) {
      failures.push(
        `beacons are breathing without data-breathe — opt-in ambient motion is declared in the ` +
        'composition, not assumed',
      );
    }

    /* Ambient law: infinite loops keep the ambient cadence and spend one
       shared budget, counted by distinct loop hosts. */
    if (record.timing.iterations === Infinity) {
      loopHosts.add(record.loopHost ?? record.name);
      const seconds = record.timing.durationMs / 1000;
      if (seconds < manifest.ambient.minSeconds) {
        failures.push(`"${record.name}" loops at ${seconds}s — ambient loops are slow (≥ ${manifest.ambient.minSeconds}s)`);
      }
      if (manifest.ambient.wholeSecondsOnly && record.timing.durationMs % 1000 !== 0
          && !allowsOf.has(`duration:${seconds}s`)) {
        failures.push(`"${record.name}" loops at ${seconds}s — ambient cadences live on whole seconds`);
      }
    }

    /* Headline law: while the flow is the page's narrative moment, nothing
       else animates a headline against it. */
    if (record.onHeadline && !record.inFlow) {
      failures.push(
        `"${record.name}" animates a headline outside the flow while the flow plays — ` +
        "the flow is the page's one narrative moment",
      );
    }
  }

  if (loopHosts.size > manifest.limits.ambientPerViewport) {
    failures.push(
      `${loopHosts.size} ambient motion sources on one page — one ambient focal motion per viewport, ` +
      "and a breathing carrier spends the same budget as the aurora",
    );
  }

  return failures;
}

/* ── the two documented snippets ─────────────────────────────────────────
   Published as constants so the guide, the fixture builder and every consumer
   share one source instead of forking the trigger contract per project.

   THE ARMING RULE. The trigger snippet stamps data-motion-armed on the root
   BEFORE observing, and the armed-hidden CSS keys on that stamp — never on
   html.js. A consumer who loads the stylesheet without this snippet therefore
   hides nothing, ever: pre-reveal hiding exists only while an observer is
   demonstrably watching. */
export const MOTION_TRIGGER_SNIPPET = `(() => {
  const flows = document.querySelectorAll('[data-ledger-motion="flow"]:not([data-motion-static])');
  if (!flows.length) return;
  const play = (el) => el.classList.add('is-flowing');
  if (!('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    flows.forEach(play);
    return;
  }
  document.documentElement.setAttribute('data-motion-armed', '');
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { play(entry.target); io.unobserve(entry.target); }
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });
  flows.forEach((el) => io.observe(el));
})();`;

export const MOTION_LOOP_SNIPPET = `(() => {
  const loops = document.querySelectorAll('[data-ledger-motion-loop]');
  if (!loops.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    entry.target.toggleAttribute('data-motion-paused', !entry.isIntersecting);
  }), { threshold: 0 });
  loops.forEach((el) => io.observe(el));
})();`;
