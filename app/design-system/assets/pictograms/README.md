# Frontira Pictograms

This directory is the production source of truth for Frontira's reusable
pictogram language. It is separate from `assets/icons/`, which contains product
and app identity icons.

## Contract

- Family: Phosphor
- Version: 2.1.1
- Weight: Regular only
- Colour: `currentColor`
- Default size: 24px
- Minimum size: 16px
- Names: Frontira semantic aliases, never provider identifiers

`manifest.json` assigns meaning. `source/phosphor-regular.json` contains the
pinned upstream SVG subset. `scripts/build-pictograms.mjs` generates all
consumer assets from those two files.

## Namespaces

- `engagement.*` is reserved for named Frontira engagements.
- `activity.*` describes generic actions inside or between engagements.
- The remaining namespaces describe systems, data, people, interfaces,
  intelligence, orchestration and governance.

Do not use `engagement.scoping` for a generic meeting, handoff or review. Do not
substitute another provider icon because an individual glyph feels preferable.

## Build

```bash
npm run build:pictograms
npm run check:pictograms
```

The check validates the manifest, provider pin, SVG safety, generated API,
checksums, accessibility defaults and orphaned assets.

The initial agentic application proof added durable semantics for approval,
audit, escalation, permission, readiness and accountable ownership in manifest
v1.1. These names describe cross-product meaning; they do not mirror one
screen's labels or a provider's icon names.

## Usage

```js
const {
  getPictogram,
  renderPictogram,
} = require('@frontira/design-system/pictograms');

const definition = getPictogram('engagement.scoping');
const decorative = renderPictogram('systems.integration');
const meaningful = renderPictogram('engagement.scoping', {
  label: 'Scoping',
  size: 32,
});
```

Static SVG assets are available through:

```text
@frontira/design-system/pictograms/engagement.scoping.svg
```

Load `@frontira/design-system/pictograms.css` for the canonical size utilities.

## Visual rules

1. Use one pictogram family and one weight in a composition.
2. Use one accent colour by default.
3. Use role or state colours only when their meaning remains stable.
4. Let one large relationship, path or field carry the house gradient.
5. Keep small controls and repeated icon sets solid.
6. Pair unfamiliar or meaningful icons with visible text. Icon-only controls
   require an accessible name.
7. Draw a custom Frontira symbol only when the canonical family lacks the
   concept, not because a single Phosphor glyph feels imperfect.
8. Use `@frontira/design-system/control-glyphs` for interface chrome such as
   close, disclosure, back and run. Control glyphs are not domain pictograms.
