/* ==========================================================================
   miro-profile.mjs — the Ledger collaboration-surface laws, as code (#39).

   Every other contract in this package can be rendered and measured. This one
   cannot: the surface belongs to Miro, and Miro returns the NAME of a sticky
   colour, never the hex it paints. So the honest split is built into the
   contract itself — what is checkable offline, what needs a live board, and
   what a person has to look at.

   The measurement that shapes everything here: Miro's API refuses a hex fill
   on a sticky note.

     400  code 2.0703  style.fillColor
     Unexpected value [#6F43D5], expected one of:
     [gray, light_yellow, yellow, orange, light_green, green, dark_green,
      cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black]

   So Ledger's palette is reachable on authored scaffolding and unreachable on
   the objects participants actually touch. A profile that ignored that would
   be describing a board nobody can build — which is how the SPAR canvas ended
   up as a single flattened PNG with no affordances at all.

     import { validateProfile, roleFor, auditBoard } from '@frontira/design-system/miro-profile';
   ========================================================================== */

const entries = (obj) => Object.entries(obj ?? {}).filter(([k]) => !k.startsWith('$'));

/* Miro's enum, as the API reported it. Duplicated here deliberately: the
   manifest is data and can be edited, and this is the thing it must agree
   with. If Miro ever widens the palette, both change together and the
   disagreement is what surfaces it. */
export const MIRO_STICKY_COLOURS = [
  'gray', 'light_yellow', 'yellow', 'orange', 'light_green', 'green', 'dark_green',
  'cyan', 'light_pink', 'pink', 'violet', 'red', 'light_blue', 'blue', 'dark_blue', 'black',
];

/* ── the profile's own laws ─────────────────────────────────────────────── */
export function validateProfile(profile, tokens = null) {
  const problems = [];
  const p = profile ?? {};

  if (p.register?.default !== 'paper') {
    problems.push('a workshop board is a surface people write on; the ink register would make it a dark room');
  }

  /* The palette pin must match Miro's real enum exactly — not a subset a
     profile found convenient, and not a superset with an invented colour. */
  const allowed = p.stickyPalette?.allowed ?? [];
  const missing = MIRO_STICKY_COLOURS.filter((c) => !allowed.includes(c));
  const invented = allowed.filter((c) => !MIRO_STICKY_COLOURS.includes(c));
  if (missing.length) problems.push(`the sticky palette pin is missing ${missing.join(', ')} — it must transcribe Miro's enum, not a subset`);
  if (invented.length) problems.push(`the sticky palette pin invents ${invented.join(', ')}, which Miro will reject at 400`);
  if (p.stickyPalette?.hexAccepted) {
    problems.push('Miro rejects hex on a sticky (code 2.0703); a profile claiming otherwise describes a board nobody can build');
  }

  /* Two layers, or the contract has nothing to say about the split that
     caused the failure. */
  if (p.layers?.scaffolding?.colour !== 'ledger-hex') {
    problems.push('authored scaffolding accepts arbitrary colour, so it carries Ledger hex exactly — approximating it there is a choice, not a constraint');
  }
  if (p.layers?.participant?.colour !== 'miro-named') {
    problems.push('participant stickies are locked to named colours; claiming hex there is the error the API refuses');
  }
  if (p.layers?.participant?.editableInSession !== true) {
    problems.push('a board whose participant objects are locked is a picture of a workshop');
  }
  if (p.layers?.scaffolding?.editableInSession !== false) {
    problems.push('scaffolding participants can drag will not survive its first session');
  }

  /* The failure mode, named. */
  if (p.prohibitions?.flattenedCanvasImage?.forbidden !== true) {
    problems.push('a rendered canvas pasted as one image removes every affordance a workshop needs; the profile must forbid it by name');
  }
  if (p.prohibitions?.corePaletteChange?.forbidden !== true) {
    problems.push('#39 is explicit that no Ledger token may change solely to accommodate Miro');
  }

  /* Roles: #39 names four, plus the documented exception. */
  for (const required of ['framing', 'system', 'action', 'input']) {
    if (!p.roles?.[required]) problems.push(`#39 names a ${required} role; the profile must map it`);
  }
  for (const [name, role] of entries(p.roles)) {
    if (!role.sticky) { problems.push(`role ${name} maps to no sticky colour`); continue; }
    if (!MIRO_STICKY_COLOURS.includes(role.sticky)) {
      problems.push(`role ${name} maps to "${role.sticky}", which Miro will reject`);
    }
    if (role.exception) {
      if (role.ledgerToken || role.ledgerHex) {
        problems.push(`role ${name} is a Miro-native exception, so it must NOT claim a Ledger token — that is how a new core colour gets invented sideways`);
      }
    } else if (!role.ledgerToken || !role.ledgerHex) {
      problems.push(`role ${name} must name the Ledger token it represents, or the two halves of the surface drift apart`);
    }
  }

  /* Distinct colours, or the roles are not readable as roles. */
  const used = entries(p.roles).map(([, r]) => r.sticky);
  const dupes = used.filter((c, i) => used.indexOf(c) !== i);
  if (dupes.length) problems.push(`roles share the sticky colour ${[...new Set(dupes)].join(', ')} — two meanings on one colour is not a mapping`);

  /* Typography: the sticky constraint must be stated as a platform fact. */
  if (p.typography?.stickyText?.controllable !== false) {
    problems.push('sticky typography is not settable through the API; a profile that claims it is will be written against a control that does not exist');
  }

  /* Brand Center governance — the part that can quietly go org-wide. */
  if (p.brandCenter?.scope !== 'organization-wide') {
    problems.push('Brand Center configuration reaches every team and board; scoping it per board is the misunderstanding #40 warns about');
  }
  if (p.brandCenter?.requiresHumanAction !== true) {
    problems.push('installing fonts or changing defaults affects every client-facing board and is performed by a person, never automated from this package');
  }

  /* A recorded review must say who and when, or it is a claim wearing the
     costume of evidence. */
  const review = p.verification?.humanReview;
  if (review && review.status === 'recorded') {
    for (const field of ['date', 'reviewer', 'board', 'outcome']) {
      if (!review[field]) problems.push(`the human review claims to be recorded but names no ${field}`);
    }
  }

  /* Honesty about what cannot be measured. */
  if (!(p.verification?.requiresHumanReview ?? []).length) {
    problems.push('Miro never returns a sticky hex, so contrast cannot be measured here; a profile claiming full offline verification is overstating itself');
  }

  /* The cross-pin. This is the strongest offline gate: every Ledger hex the
     profile names must still be that value in the generated token source, so
     the profile cannot quietly drift from the palette it claims to follow —
     and a token edit made "for Miro" fails here. */
  if (tokens) {
    for (const [name, role] of entries(p.roles)) {
      if (!role.ledgerToken) continue;
      const actual = role.ledgerToken.split('.').reduce((o, k) => (o ?? {})[k], tokens);
      const hex = typeof actual === 'string' ? actual : actual?.value;
      if (!hex) {
        problems.push(`role ${name} pins ${role.ledgerToken}, which is not in the token source`);
      } else if (hex.toUpperCase() !== role.ledgerHex.toUpperCase()) {
        problems.push(`role ${name} pins ${role.ledgerHex} but ${role.ledgerToken} is ${hex} — the profile has drifted from the palette`);
      }
    }
  }
  return problems;
}

/* ── the mapping, as a function ─────────────────────────────────────────── */
export function roleFor(meaning, profile) {
  const hit = entries(profile?.roles).find(([name]) => name === meaning);
  if (!hit) {
    throw new Error(`unknown collaboration role "${meaning}" — the profile defines ${entries(profile?.roles).map(([k]) => k).join(', ')}`);
  }
  return { name: hit[0], ...hit[1] };
}

export function stickyColourFor(meaning, profile) {
  return roleFor(meaning, profile).sticky;
}

/* ── auditing a real board ──────────────────────────────────────────────
   The one check that needs Miro. Give it the item list from
   GET /v2/boards/{id}/items and it reports what the profile forbids.

   The flattened-canvas test is the reason this exists: a board that is one
   frame and one large image has no affordances, and that is exactly what the
   SPAR Scoping Canvas is today. */
export function auditBoard(items, profile, { frameFillRatio = 0.6 } = {}) {
  const findings = [];
  const list = items ?? [];
  const frames = list.filter((i) => i.type === 'frame');
  const images = list.filter((i) => i.type === 'image');
  const stickies = list.filter((i) => i.type === 'sticky_note');

  for (const image of images) {
    const parent = frames.find((f) => f.id === image.parent?.id);
    if (!parent) continue;
    const area = (image.geometry?.width ?? 0) * (image.geometry?.height ?? 0);
    const frameArea = (parent.geometry?.width ?? 0) * (parent.geometry?.height ?? 0);
    if (frameArea > 0 && area / frameArea >= frameFillRatio) {
      findings.push({
        rule: 'flattenedCanvasImage',
        severity: 'error',
        detail: `an image covers ${Math.round((area / frameArea) * 100)}% of frame "${parent.data?.title ?? parent.id}" — `
          + 'a rendered canvas pasted as one picture cannot be moved, clustered, written on or voted on',
      });
    }
  }

  if (frames.length && !stickies.length) {
    findings.push({
      rule: 'noParticipantObjects',
      severity: 'error',
      detail: 'the board has framed zones but no sticky notes at all, so nothing on it is a working surface',
    });
  }

  const legal = new Set(entries(profile?.roles).map(([, r]) => r.sticky));
  for (const sticky of stickies) {
    const fill = sticky.style?.fillColor;
    if (fill && !legal.has(fill)) {
      findings.push({
        rule: 'unmappedStickyColour',
        severity: 'warning',
        detail: `a sticky uses "${fill}", which carries no role in the profile — it is legal in Miro and meaningless in Ledger`,
      });
    }
  }
  return findings;
}
