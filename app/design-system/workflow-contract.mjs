/* ==========================================================================
   workflow-contract.mjs — card anatomy and workflow step states, as code
   (#67, #68).

   Two issues, one module, because #68's step card IS a #67 sequence card. The
   state a step is in decides what its trailing slot may hold; splitting them
   would let the marker law and the state law disagree about the same corner
   of the same element.

   PURE. No fs, no DOM, no randomness — the manifest is passed in. That is
   what lets David vendor the laws, what lets deriveStates be the single
   source of a step's state in any framework, and what makes every gate here
   mutation-testable without a browser.

   WHY deriveStates EXISTS AT ALL
   ------------------------------
   The consumer (frontira-agentic-ai#12) computed four steps' states with four
   hand-written nested ternaries over booleans:

     const reviewUnlocked = definitionConfirmed && guardrailsConfirmed && accessConfirmed;
     const stepTwoState = !definitionConfirmed ? 'locked' : guardrailsConfirmed ? 'complete' : …

   Two things follow, and both are why this function is the deliverable. The
   dependency graph is invisible — it lives smeared across boolean names, so
   nothing can validate it, draw it, or notice a cycle. And confirmations are
   never REVOKED: flip definitionConfirmed false and step two reads `locked`
   while guardrailsConfirmed stays true, so re-confirming step one shows step
   two `complete` again and nobody re-reviewed it. Here, the graph is data and
   revocation is transitive.
   ========================================================================== */

export const CONTRACT_VERSION_MAJOR = 1;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── validateWorkflowManifest ───────────────────────────────────────────── */
export function validateWorkflowManifest(manifest) {
  const problems = [];
  const roles = manifest.cards?.roles ?? {};

  for (const [name, role] of Object.entries(roles)) {
    if (!role.leading) problems.push(`cards.roles.${name} declares no leading marker`);
    if (!role.trailing?.length) problems.push(`cards.roles.${name} declares no trailing slot`);
    if (role.leading === 'index' && role.pictogramAllowed) {
      problems.push(
        `cards.roles.${name} leads with an index AND allows a pictogram — a card in an ordered ` +
        'sequence takes its identity from its number; a pictogram beside it answers a question ' +
        'already answered',
      );
    }
    if (role.pictogramRequired && !role.pictogramAllowed) {
      problems.push(`cards.roles.${name} requires a pictogram it does not allow`);
    }
  }

  /* Summary and receipt are peers by design: the whole point of the receipt
     role is that evidence cards do not drift into their own anatomy. */
  const summary = roles.summary;
  const receipt = roles.receipt;
  if (summary && receipt) {
    if (summary.leading !== receipt.leading
        || JSON.stringify(summary.trailing) !== JSON.stringify(receipt.trailing)) {
      problems.push(
        'cards.roles.summary and cards.roles.receipt have drifted apart — a receipt is a summary ' +
        'card carrying evidence, and peers share one header anatomy',
      );
    }
  }

  if (manifest.cards?.markerLimit !== 1) {
    problems.push('cards.markerLimit must be 1 — one primary marker per card header');
  }

  const states = manifest.steps?.states ?? [];
  for (const required of ['locked', 'ready', 'active', 'complete']) {
    if (!states.includes(required)) {
      problems.push(
        `steps.states omits "${required}" — the four states are the model; deriving one from ` +
        'booleans at each call site is how four steps get four gating rules',
      );
    }
  }
  if (!(manifest.steps?.status ?? []).includes('invalid')) {
    problems.push('steps.status omits "invalid" — validation is a status in the trailing slot, not a fifth state');
  }
  if (manifest.steps?.lockedRequiresReason !== true) {
    problems.push('steps.lockedRequiresReason must be true — a locked step says why, and what unlocks it');
  }

  if (manifest.graph?.acyclic !== true) problems.push('graph.acyclic must be true');
  if (manifest.graph?.revocation !== 'transitive') {
    problems.push(
      'graph.revocation must be "transitive" — anything less lets a step re-lock while staying ' +
      'confirmed, and the confirmation survives a change it never saw',
    );
  }

  const motion = manifest.motion ?? {};
  if (!(motion.transitionMsMin >= 160 && motion.transitionMsMax <= 200 && motion.transitionMsMin <= motion.transitionMsMax)) {
    problems.push('motion transition bounds must stay within 160–200ms');
  }
  if (motion.passiveCardTranslates !== false) {
    problems.push('motion.passiveCardTranslates must be false — a card that is not a control does not move on hover');
  }
  if (!(motion.actionableLiftPxMax <= 2)) {
    problems.push('motion.actionableLiftPxMax must be at most 2');
  }

  return problems;
}

/* ── validateGraph ──────────────────────────────────────────────────────────
   `graph` is [{ id, requires: [] }] in presentation order. */
export function validateGraph(graph, manifest) {
  const problems = [];
  const ids = graph.map((step) => step.id);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) problems.push(`step "${id}" is declared twice`);
    seen.add(id);
  }

  for (const step of graph) {
    for (const dependency of step.requires ?? []) {
      if (!seen.has(dependency)) {
        problems.push(`step "${step.id}" requires "${dependency}", which is not a step in this workflow`);
      }
      if (dependency === step.id) problems.push(`step "${step.id}" requires itself`);
    }
  }

  /* Cycles. A workflow that cannot be entered is not a workflow, and a cycle
     is exactly how a hand-written boolean gate deadlocks in production. */
  if (manifest.graph.acyclic) {
    const state = new Map();
    const byId = new Map(graph.map((step) => [step.id, step]));
    const walk = (id, trail) => {
      if (state.get(id) === 'done') return;
      if (state.get(id) === 'open') {
        problems.push(`prerequisites form a cycle: ${[...trail, id].join(' → ')} — a step cannot wait on itself`);
        return;
      }
      state.set(id, 'open');
      for (const dependency of byId.get(id)?.requires ?? []) {
        if (byId.has(dependency)) walk(dependency, [...trail, id]);
      }
      state.set(id, 'done');
    };
    for (const id of ids) walk(id, []);
  }

  /* An entry point must exist, or nothing can ever start. */
  if (graph.length && !graph.some((step) => !(step.requires ?? []).length)) {
    problems.push('no step is free of prerequisites — the workflow can never be entered');
  }

  return problems;
}

/* ── deriveStates ───────────────────────────────────────────────────────────
   The single source of a step's state. Given the graph, the set of confirmed
   step ids and the focused step, returns { id: { state, status, reason,
   revoked } } for every step.

   TRANSITIVE REVOCATION is the whole point. A confirmation only survives if
   every prerequisite is still confirmed — checked through the graph, not one
   level deep — so un-confirming an early step reopens everything downstream
   of it and re-confirming it does NOT silently restore work nobody reviewed
   again. `revoked` says so explicitly, because a UI that reopens work without
   telling anyone is its own defect. */
export function deriveStates(graph, { confirmed = [], focus = null } = {}, manifest) {
  const byId = new Map(graph.map((step) => [step.id, step]));
  const claimed = new Set(confirmed);

  /* A confirmation stands only on standing ground. Iterate to a fixed point:
     revoking one confirmation can revoke the next. */
  const standing = new Set(claimed);
  let moved = true;
  while (moved) {
    moved = false;
    for (const id of [...standing]) {
      const requires = byId.get(id)?.requires ?? [];
      if (requires.some((dependency) => !standing.has(dependency))) {
        standing.delete(id);
        moved = true;
      }
    }
  }

  const out = {};
  for (const step of graph) {
    const requires = step.requires ?? [];
    const unmet = requires.filter((dependency) => !standing.has(dependency));
    const revoked = claimed.has(step.id) && !standing.has(step.id);

    let state;
    let reason = null;
    if (unmet.length) {
      state = 'locked';
      const names = unmet.map((id) => byId.get(id)?.label ?? id);
      reason = `Confirm ${names.join(' and ')} to unlock this step.`;
    } else if (standing.has(step.id)) {
      state = 'complete';
    } else if (focus === step.id) {
      state = 'active';
    } else {
      state = 'ready';
    }

    out[step.id] = {
      state,
      status: step.status ?? 'none',
      reason,
      revoked,
      /* Stated for the accessible name and for the check: a locked step is
         disabled, an active step carries aria-current. */
      disabled: state === 'locked',
      ariaCurrent: state === 'active' ? 'step' : null,
    };
  }

  /* Focus on a locked step is a bug in the caller, not a fifth state. */
  if (focus && out[focus]?.state === 'locked') {
    out[focus].focusError = `step "${focus}" is focused but locked — ${out[focus].reason}`;
  }
  return out;
}

/* ── validateCard ───────────────────────────────────────────────────────────
   The generator-facing rule #67 asks for: reject conflicting marker slots
   before anything renders. `card` is { role, index, pictogram, trailing }. */
export function validateCard(card, manifest) {
  const problems = [];
  const role = manifest.cards.roles[card.role];
  if (!role) {
    problems.push(`unknown card role "${card.role}" (${Object.keys(manifest.cards.roles).join(' | ')})`);
    return problems;
  }

  const leadingMarkers = [
    card.index !== undefined && card.index !== null ? 'index' : null,
    card.pictogram ? 'pictogram' : null,
  ].filter(Boolean);

  if (leadingMarkers.length > manifest.cards.markerLimit) {
    problems.push(
      `a ${card.role} card carries ${leadingMarkers.join(' and ')} in one header — ` +
      'at most one primary marker per card header; a number and a pictogram are two answers ' +
      'to the same question',
    );
  }
  if (role.leading === 'index' && card.pictogram) {
    problems.push(
      `a ${card.role} card takes its identity from its index, so it carries no pictogram ` +
      `(got "${card.pictogram}")`,
    );
  }
  if (role.leading === 'index' && (card.index === undefined || card.index === null)) {
    problems.push(`a ${card.role} card needs its index — the position is the marker`);
  }
  if (role.pictogramRequired && !card.pictogram) {
    problems.push(`a ${card.role} card needs one semantic pictogram in its leading slot`);
  }
  if (role.semantics && card.pictogram && !role.semantics.includes(card.pictogram)) {
    problems.push(
      `a ${card.role} card names "${card.pictogram}"; it carries ${role.semantics.join(', ')}. ` +
      (manifest.cards.roles[card.role].semanticsNote ?? ''),
    );
  }
  const trailing = card.trailing ?? 'none';
  if (!role.trailing.includes(trailing)) {
    problems.push(
      `a ${card.role} card's trailing slot holds ${role.trailing.join(' or ')} (got "${trailing}")`,
    );
  }
  return problems;
}

/* ── emitters ───────────────────────────────────────────────────────────────
   Deterministic markup for the anatomy the laws describe. */
export function cardFor(card, manifest) {
  const problems = validateCard(card, manifest);
  if (problems.length) throw new Error(`workflow: ${problems[0]}`);

  const role = manifest.cards.roles[card.role];
  const attributes = {
    'data-ledger-ui': 'card',
    'data-ledger-card': card.role,
    ...(card.motif ? { 'data-card-motif': '' } : {}),
  };

  const leading = role.leading === 'index'
    ? `<span class="lg-card-index" aria-hidden="true"><small>Step</small>${String(card.index).padStart(2, '0')}</span>`
    : `<span class="lg-card-pictogram" data-pictogram="${esc(card.pictogram)}" aria-hidden="true"></span>`;

  const trailing = (card.trailing && card.trailing !== 'none')
    ? `<span class="lg-card-trailing" data-slot="${esc(card.trailing)}">${esc(card.trailingLabel ?? '')}</span>`
    : '';

  const markup =
    `<header class="lg-card-header">${leading}` +
    `<div class="lg-card-heading"><h3>${esc(card.title ?? '')}</h3>` +
    `<p>${esc(card.description ?? '')}</p></div>${trailing}</header>`;

  return { attributes, markup };
}

/* A step card is a sequence card whose trailing slot carries its state. */
export function stepFor(step, derived, manifest) {
  const card = {
    role: 'sequence',
    index: step.index,
    title: step.label,
    description: step.description,
    trailing: 'state',
    trailingLabel: derived.state,
  };
  const { attributes, markup } = cardFor(card, manifest);
  return {
    attributes: {
      ...attributes,
      'data-step-state': derived.state,
      ...(derived.status && derived.status !== 'none' ? { 'data-step-status': derived.status } : {}),
      ...(derived.ariaCurrent ? { 'aria-current': derived.ariaCurrent } : {}),
      ...(derived.disabled ? { 'aria-disabled': 'true' } : {}),
    },
    markup: markup + (derived.reason
      ? `<p class="lg-step-reason">${esc(derived.reason)}</p>`
      : ''),
  };
}
