# itch-prep-sim

ITCHATHON Challenge 4 restaurant prep forecasting and Jev simulation prototype

Scaffolded by the Frontira David — a minimal Next.js 16 + shadcn/ui
baseline that builds clean and deploys to Vercel on first push.

The selected design profile and its exact provenance are recorded in
`design-system.lock.json`. Keep that file and `pnpm-lock.yaml` committed.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Social preview ownership

The scaffold includes canonical Open Graph and Twitter large-card metadata plus
a profile-themed 1200 × 630 preview. Before launch, the page owner must finalize
the public title, description, and preview copy, and set `NEXT_PUBLIC_SITE_URL`
to the canonical production origin.

## Visual acceptance

`visual-acceptance.json` is the selected profile's versioned browser-review
contract. Run `pnpm build`, install Chromium once with
`pnpm exec playwright install chromium`, then run `pnpm test:visual`. The gate
captures desktop, mobile, and reduced-motion screenshots, a contact sheet, and
structural/accessibility results under `artifacts/visual-acceptance/`.

A green build and a green automated gate are evidence, not aesthetic approval.
Human review remains required. Profile upgrades must preserve before/after
artifacts; a baseline is never rewritten automatically. Pull requests that
change `design-system.lock.json` or `visual-acceptance.json` run both revisions
and upload a `visual-upgrade-receipt` containing the screenshots, side-by-side
contact sheet, structural results, and old/new provenance. If the declared
baseline changes, commit `visual-baseline-update.json` with an explicit reason
and acknowledgement or the receipt job fails.

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Biome](https://biomejs.dev) for lint + format
