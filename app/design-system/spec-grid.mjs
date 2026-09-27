/* ==========================================================================
   spec-grid.mjs — the Ledger Spec Grid laws, as code (#46).

   The component is a hairline matrix for finite sets of comparable
   principles. Its one genuinely hard property is not the hairline: it is the
   RAGGED LAST ROW. With 4–8 items in 2 or 3 columns the item count usually
   does not divide evenly, the last row comes up short, and the matrix's
   frame hangs open to the right of the last cell — measured at up to 657px.

   CSS cannot fix that, because CSS cannot count the items to know the
   remainder. So the row is completed here, by an emitter, and the rendered
   check proves the frame closes to 0px.

     import { specGridFor } from '@frontira/design-system/spec-grid';
   ========================================================================== */

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ── manifest laws ───────────────────────────────────────────────────────
   The manifest is data, so it can drift. These are the claims that would
   stop being true if it did. */
export function validateSpecManifest(manifest) {
  const problems = [];
  const m = manifest ?? {};

  const allowed = m.columns?.allowed ?? [];
  if (!allowed.includes(2) || !allowed.includes(3)) {
    problems.push('#46 specifies two AND three column examples; columns.allowed must offer both');
  }
  if (allowed.includes(1)) {
    problems.push('one column is a list, not a matrix — the pattern adds nothing and should not be offered');
  }

  if (m.borders?.technique !== 'explicit-cell-borders') {
    problems.push('the hairline technique is explicit-cell-borders: gap-as-hairline was measured to double the bottom edge and to paint a ragged remainder as a filled block');
  }
  if (m.borders?.doublingToleranceCss !== 0) {
    problems.push('"without broken or doubled internal borders" is a claim about zero, so doublingToleranceCss is 0');
  }

  if (m.raggedRow?.strategy !== 'filler-cells') {
    problems.push('a short last row leaves the frame open and CSS cannot count items to close it; the emitter completes the row with fillers');
  }
  if (m.raggedRow?.fillerCarriesContent) {
    problems.push('a filler carries no content — a cell with copy in it is an item, and the set would be misreported');
  }
  if (m.raggedRow?.maxOpenEdgePx !== 0) {
    problems.push('the matrix closes completely or it does not close; maxOpenEdgePx is 0');
  }
  if (m.raggedRow?.fillerAttributes?.['aria-hidden'] !== 'true') {
    problems.push('a filler is hidden from assistive technology, or the set is announced with a hole in it');
  }
  if (m.raggedRow?.breakpointAware !== true) {
    problems.push('collapsing changes the remainder, so a filler count baked for the authored width goes ragged again at the next breakpoint');
  }

  if (m.layer?.rootAttribute) {
    problems.push('the spec grid is editorial content, not an application control: data-ledger-ui is reserved for interactive roots and would drag in the component layer');
  }
  if (m.layer?.cascadeLayer) {
    problems.push('an unlayered rule beats any layered one (#54), and this file must work in labs and decks that never load the component layer');
  }

  if (m.anatomy?.index?.shape !== 'bare') {
    problems.push('a numbered index is a label, not a badge — a disc reads as an icon container, which is what the card contract already refused');
  }
  if (m.anatomy?.pictogram?.replacesIndex !== true) {
    problems.push('a pictogram takes the leading slot INSTEAD of the index; a position and an identity in one slot is two answers to one question');
  }

  for (const forbidden of ['box-shadow', 'border-radius']) {
    if (!(m.surface?.forbidden ?? []).includes(forbidden)) {
      problems.push(`#46 names ${forbidden} a non-goal; the surface contract must forbid it`);
    }
  }
  if (m.accessibility?.readingOrder !== 'dom-order') {
    problems.push('reading order is DOM order — CSS reordering would separate the visual set from the announced one');
  }
  if (m.columns?.collapseBasis !== 'container') {
    problems.push('the column count follows CONTAINER width, not the viewport: a slide is authored at 1920px and scaled, so a viewport rule would reflow a stage that never changed size');
  }
  if (!m.columns?.queryContainerClass) {
    problems.push('a container query needs a container — the emitter has to supply the wrapper, because an element cannot answer a query about its own width');
  }
  if ((m.items?.min ?? 0) < 1 || (m.items?.max ?? 0) <= (m.items?.min ?? 0)) {
    problems.push('items.min/items.max must bound a real range');
  }
  return problems;
}

/* ── the set itself ─────────────────────────────────────────────────────── */
export function validateSpec({ items = [], columns = 3, pictograms = false } = {}, manifest) {
  const problems = [];
  const allowed = manifest?.columns?.allowed ?? [2, 3];

  if (!allowed.includes(columns)) {
    problems.push(`${columns} columns is not offered — the spec grid runs at ${allowed.join(' or ')}`);
  }
  const { min, max } = manifest?.items ?? {};
  if (items.length < min) {
    problems.push(`${items.length} items is a list, not a matrix (the spec grid starts at ${min})`);
  }
  if (items.length > max) {
    problems.push(`${items.length} items stops being scannable and wants a table (the spec grid ends at ${max})`);
  }

  items.forEach((item, i) => {
    if (!item?.title) problems.push(`item ${i + 1} has no title`);
    if (!item?.body) problems.push(`item ${i + 1} has no supporting copy — an empty cell is a hole in the set`);
    if (pictograms && !item?.pictogram) {
      problems.push(`item ${i + 1} has no pictogram, and a matrix where only some cells carry one is not comparable`);
    }
    if (!pictograms && item?.pictogram) {
      problems.push(`item ${i + 1} carries a pictogram in an indexed grid — the leading slot holds a position or an identity, never both`);
    }
  });
  return problems;
}

/* How many cells the last row is missing. The whole reason this module
   exists: `(3 - (5 % 3)) % 3` is 1, and no stylesheet can compute it. */
export function fillerCount(itemCount, columns) {
  if (!Number.isInteger(itemCount) || !Number.isInteger(columns) || columns < 1) return 0;
  return (columns - (itemCount % columns)) % columns;
}

/* Collapsing changes the remainder — 8 items need one filler at 3 columns
   and none at 2 — so a filler is marked with every column count it is
   needed at, and each breakpoint shows only its own. Emitting the maximum
   and hiding the surplus is what keeps ONE set of markup correct at all
   three widths; a count baked for the authored width goes ragged the moment
   the grid collapses. */
export function fillerPlan(itemCount, columnsAllowed = [2, 3]) {
  const needed = new Map(columnsAllowed.map((c) => [c, fillerCount(itemCount, c)]));
  const total = Math.max(0, ...needed.values());
  return Array.from({ length: total }, (_, i) =>
    columnsAllowed.filter((c) => i < needed.get(c)).map(String).join(' '));
}

/* ── emission ───────────────────────────────────────────────────────────── */
export function specGridFor(spec, manifest) {
  const problems = validateSpec(spec, manifest);
  if (problems.length) throw new Error(`illegal spec grid:\n  ${problems.join('\n  ')}`);

  const { items, columns, pictograms = false, label = null } = spec;
  const allowed = manifest?.columns?.allowed ?? [2, 3];
  const fillers = fillerPlan(items.length, allowed);

  const cells = items.map((item, i) => {
    const leading = pictograms
      ? `<span class="lg-spec-pictogram" data-pictogram="${esc(item.pictogram)}" aria-hidden="true"></span>`
      : `<span class="lg-spec-index">${String(i + 1).padStart(2, '0')}</span>`;
    /* An optional lead-in term. The Icon Family Lab's rules open with the
       category they govern — "Family. Do not mix providers…" — and flattening
       that into the sentence would have lost a distinction the set relies on
       to be scannable. It is emphasis, not a second title: still one <b> per
       cell, still the same slot. */
    const lead = item.lead ? `<strong>${esc(item.lead)}</strong> ` : '';
    return `  <li class="lg-spec-cell">
    ${leading}
    <b class="lg-spec-title">${esc(item.title)}</b>
    <p class="lg-spec-body">${lead}${esc(item.body)}</p>
  </li>`;
  });

  /* The fillers close the frame. They are last in DOM order, so reading
     order is untouched, and aria-hidden, so the set is still announced as N
     items. Each carries the column counts at which it is needed. */
  for (const at of fillers) {
    cells.push(`  <li class="lg-spec-cell" data-spec-filler="${at}" aria-hidden="true"></li>`);
  }

  const attributes = {
    class: 'lg-spec-grid',
    'data-columns': String(columns),
    ...(pictograms ? { 'data-leading': 'pictogram' } : {}),
    ...(label ? { 'aria-label': esc(label) } : {}),
  };

  /* The wrapper is the query container. An element cannot answer a container
     query about its own width, and the collapse has to follow the container
     rather than the viewport — a slide is authored at 1920px and scaled, so
     its width never changes however narrow the browser gets. */
  const list = `<ul${Object.entries(attributes).map(([k, v]) => ` ${k}="${v}"`).join('')}>\n${cells.join('\n')}\n</ul>`;

  return {
    attributes,
    fillers,
    fillersAt: (cols) => fillers.filter((at) => at.split(' ').includes(String(cols))).length,
    markup: cells.join('\n'),
    list,
    html: `<div class="lg-spec">\n${list.split('\n').map((l) => `  ${l}`).join('\n')}\n</div>`,
  };
}
