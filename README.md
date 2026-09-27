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

The restaurant panel accepts a name and city or a Google Maps URL. With `APIFY_TOKEN`, it uses Apify Google Maps Scraper for both search and detail enrichment, so no Google Maps API key is required. If only `GOOGLE_MAPS_API_KEY` is configured, name search uses Google Places; detail enrichment still needs Apify. Put keys in local `.env.local` and the Vercel Preview environment. The app never sends a key to the browser. Each explicit name search is capped at five places with no detail/reviews; importing a selected place requests one detail record. This bounds, but does not eliminate, Apify charges. Do not expose the demo publicly without a persistent rate limit or access control.

Selecting a place automatically imports its detail record and changes the three-day weather location. The public venue snapshot and operator-calibrated prep items are saved in browser storage so the next morning starts immediately, without another paid scrape; snapshots seven days or older show a refresh warning. Apify may add a seven-day dinner activity chart, published hours, price range, menu URL and review topics. The operator can tap a food-related review topic to rename the selected illustrative prep item, then set its orders per 100 covers, current par and waste cost. Review topics are not validated menu items or sales counts. When present, the selected weekday's activity becomes a bounded ±15% cover prior that can be toggled off. It is a relative Google Maps popularity measure, not observed covers or dish sales. Booked covers and the event input remain synthetic until restaurant-owned data is connected. The San Francisco Trends snapshot is excluded when a real venue is selected; import a venue-relevant Trends CSV to use search momentum again.

The morning card puts all six prep quantities ahead of the detailed charts and exposes the operator's waste-versus-sellout preference as three presets. Presets change the simulation's target quantile; they are not learned cost-optimal policies. There is not yet a measured under-one-minute test against a clipboard par sheet.

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
