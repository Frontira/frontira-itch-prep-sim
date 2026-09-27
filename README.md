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

## Real restaurant connection

The restaurant panel accepts a name and city via Google Places Text Search (`GOOGLE_MAPS_API_KEY`) or a Google Maps URL via the Apify Google Places actor (`APIFY_TOKEN`). Put either server-only key in your local `.env.local` and the Vercel Preview environment. The app never sends a key to the browser.

Selecting a place changes the three-day weather location. Apify may add a seven-day dinner activity chart; when present, the selected weekday's activity becomes a bounded ±15% cover prior that can be toggled off. It is a relative Google Maps popularity measure, not observed covers or dish sales. The current menu, booked covers, and event input remain synthetic until restaurant-owned POS or reservations are connected. The San Francisco Trends snapshot is excluded when a real venue is selected; import a venue-relevant Trends CSV to use search momentum again.

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
