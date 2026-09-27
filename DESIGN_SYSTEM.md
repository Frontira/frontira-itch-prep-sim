# Design profile: Frontira Ledger 4.8

Profile id: `frontira-ledger-4-8`
Application contract: `v1`

This repository vendors @frontira/design-system 4.8.0.

- Keep `app/design-system/` and `design-system.lock.json` together; do not hand-edit generated assets.
- Use shadcn/Radix for accessible component behaviour and Ledger semantic variables for visual decisions.
- Import domain pictograms and control glyphs only through `app/design-system/iconography.tsx`.
- Use `components/ui/ledger-icon-slots.tsx` for governed shadcn slots.
- The root register is `lg-ink`. Use a nested `lg-paper` register for deliberate light surfaces.
- Run `pnpm check:design-system`, `pnpm test`, and `pnpm build` after design-system changes.
- Upgrade only through a reviewed David-generated pull request.

The exact source and integrity are recorded in `design-system.lock.json`.
