# Migration guide

## 4.8.0

No migration is required. The Miro profile is additive and changes no existing
surface.

If you maintain a workshop board built as a **flattened canvas image**, rebuild
it from native objects. The image cannot be moved, clustered, written on or
voted on, which removes the affordances the board exists for. Audit an existing
board with:

```sh
MIRO_TOKEN=… npm run check:miro-profile -- --board <boardId>
```

Brand Center remains a human action. Installing fonts or changing defaults
reaches every team and every board in the organization, including
client-facing ones, and is never automated from this package.

## 4.7.0

No migration is required for existing 4.6 applications. The brand identity
contract is additive.

Adopt it on any surface that renders the identity:

```js
import { lockupFor, variantFor } from '@frontira/design-system/brand-lockup';
import manifest from '@frontira/design-system/brand-lockup.json' with { type: 'json' };

const { html } = lockupFor({ surface: 'appHeader', heightPx: 28 }, manifest);
```

Import `@frontira/design-system/brand-lockup.css` and fill the asset slot from
`@frontira/design-system/brand/wordmark.svg` or `/brand/mark.svg`.

**If you render the wordmark through `<img>`, change it.** An `<img>` cannot
inherit `currentColor`, so the official purple is baked in; the common
workaround is `filter: brightness(0) invert(1)`, which can only ever produce
white or black and therefore cannot serve both registers. Inline the SVG
instead and let it inherit the colour the surface already declares.

Two things the contract will now refuse. A mark where the name is required,
app headers, footers, auth screens, document covers, presentation bookends,
because the lettermark does not say who this is. And the official mark placed
beside a typeset "frontira": that composition is the lockup, and the lockup
takes its name from the asset.

## 4.6.0

No migration is required for existing 4.5 applications. The Ledger Spec Grid
is a new component and nothing existing changes.

Adopt it wherever a surface hand-rolled a hairline matrix of principles or
system layers:

```js
import { specGridFor } from '@frontira/design-system/spec-grid';
import manifest from '@frontira/design-system/spec-grid.json' with { type: 'json' };

const { html } = specGridFor({ columns: 3, items }, manifest);
```

Import `@frontira/design-system/spec-grid.css` alongside it. The stylesheet is
token-only and unlayered on purpose, so it works in pages that never load the
application component layer, and it must stay unlayered: a layered rule loses
to any unlayered one.

Two things are worth knowing before hand-writing the markup instead. The
emitter appends hidden filler cells to close a short last row, which CSS
cannot do because it cannot count the items to know the remainder; without
them a 5-item, 3-column matrix hangs open by 329px. And the emitter supplies
the `.lg-spec` wrapper that the container queries need, because an element
cannot answer a container query about its own width. Omit it and the collapse
never fires at all.

## 4.5.0

No migration is required for existing 4.4 applications. Card roles and step
states are additive: a card without `data-ledger-card` keeps the anatomy it
had.

When adopting 4.5, stop computing step states in the component and derive
them from the graph:

```js
const { deriveStates, stepFor } = require('@frontira/design-system/workflow-contract');

const derived = deriveStates(graph, { confirmed, focus }, manifest);
```

`deriveStates` replaces hand-written boolean gating, and it revokes
transitively, un-confirming an upstream step reopens everything downstream
and flags it `revoked`. Boolean gating typically loses that: a step re-locks
while staying confirmed, so re-confirming the parent restores work nobody
re-reviewed.

Import `@frontira/design-system/app-cards` (composed into `app-components`
already). A card carrying `data-ledger-card` must also carry
`data-ledger-ui="card"`: the modifier is not a root, and a card without the
root falls outside the component layer's focus and reduced-motion groups.

## 4.4.0

No migration is required for existing 4.3 applications. The motion grammar is
additive: pages keep their shipped motion, and beacons breathe only where a
composition opts in with `breathe: true`.

When adopting 4.4, request the flow through the grammar rather than authoring
a sequence locally:

```js
const { flowFor, MOTION_TRIGGER_SNIPPET } = require('@frontira/design-system/motion-grammar');

flowFor(
  { stages: ['Observe', 'Decide', 'Act', 'Learn'],
    governed: 'Governed, owned, in daily operation.', settle: 'static' },
  manifest,
);
```

Import `@frontira/design-system/app-motion` after `app-components`, and embed
`MOTION_TRIGGER_SNIPPET` verbatim for viewport-entry. Without the snippet the
recipe renders its complete final state and nothing is ever hidden, so a
static page is the worst case, never a blank one. Motion durations in
consumer CSS should ride the `--lg-t-*` scale; the check refuses ad hoc
values without a reviewed manifest exemption.

The `index.js` animation vocabulary is deprecated as of this release (removal
no earlier than 5.0.0); new work uses the generated motion tokens.

## 4.3.0

No migration is required for existing 4.2 applications. The atmosphere
grammar is additive, and a page that declares no `data-ledger-section` is
untouched by it.

When adopting 4.3, request a carrier through the manifest rather than
composing backgrounds locally:

```js
const { atmosphereFor } = require('@frontira/design-system/atmosphere');

atmosphereFor(
  { section: 'hero', carrier: 'aurora', tier: 'section' },
  manifest,
  assets,
);
```

Import `@frontira/design-system/app-atmosphere` after `app-components`.
Content sits over a carrier inside `.lg-atm-content`, and a form control on a
textured section sits on `.lg-atm-copy-panel`: the rendered check refuses
both omissions. Local gradient or pattern recipes behind sections should be
deleted in favour of the manifest's carriers; anything the vocabulary cannot
express is a design-system conversation, not a consumer-local recipe.

## 4.2.0

No migration is required for existing 4.1 applications. The semantic
iconography contract is additive.

When adopting 4.2, route domain concepts through the pictogram API and small
interface actions or state through the control-glyph API:

```js
const { renderPictogram } = require('@frontira/design-system/pictograms');
const { renderControlGlyph } = require('@frontira/design-system/control-glyphs');

renderPictogram('governance.approval', { label: 'Approval' });
renderControlGlyph('control.run');
```

`@frontira/design-system/app-components` now composes
`control-glyphs.css`. Adapter-only consumers may import that CSS separately.
Use the documented component slots from `app-components.json`; the shadcn or
Radix wrapper supplies disclosure, close, selected-state and other default UI
chrome.

Remove direct imports from Lucide, Phosphor, Tabler, Material Symbols, MUI icon
packages and `react-icons` outside the reviewed application adapter. The
`@frontira/design-system/iconography-policy` export provides the same detection
logic used by generated-application checks.

Install the release exactly and commit the lockfile:

```sh
npm install --save-exact @frontira/design-system@4.2.0
```

## 4.1.0

No migration is required for adapter-only 4.0.0 consumers.

To opt into the additive component contract, replace the adapter import:

```css
@import "tailwindcss";
@import "@frontira/design-system/app-components";
```

Keep the application root on `.lg-ink`, `.lg-paper`, or the equivalent
`data-register`. Apply the stable `data-ledger-ui` attributes from
`app-components.json` to the corresponding shadcn/Radix roots and slots.

Install the release exactly and commit the lockfile:

```sh
npm install --save-exact @frontira/design-system@4.1.0
```
