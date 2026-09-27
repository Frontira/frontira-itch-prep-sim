# Ledger UI control glyphs

This directory defines the small interface glyphs owned by Ledger component
wrappers. Domain meaning belongs to `assets/pictograms/`; app identity belongs
to `assets/icons/`.

## Contract

- Family: Phosphor Regular 2.1.1, matching the pictogram system.
- Stable names: `control.*` for actions and `state.*` for compact application
  state; provider names never leave this package.
- Sizes: 12px, 16px and 20px only.
- Hit target: the owning icon-only control is at least 44px. The SVG itself is
  not enlarged to fake the hit target.
- Colour: `currentColor`.
- Accessibility: the owning button, link or component carries the accessible
  name. Decorative glyphs are `aria-hidden`. A meaningful standalone glyph
  may be rendered with a label.
- Motion: only `control.loading` animates. Reduced-motion mode shows its static
  frame.

## Component ownership

Use the slot names in `manifest.json`. Governed shadcn/Radix wrappers supply
default chrome such as select disclosure, selected indicators and dialog
close. Consumers select a stable control semantic only in documented content
slots; they never import Lucide, Phosphor or another provider directly.

```js
const {
  renderControlGlyph,
} = require('@frontira/design-system/control-glyphs');

const close = renderControlGlyph('control.close');
const loading = renderControlGlyph('control.loading', { size: 20 });
```

Load `@frontira/design-system/control-glyphs.css` for sizing, alignment and the
reduced-motion loading rule.
