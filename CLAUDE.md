# itch-prep-sim

ITCHATHON Challenge 4 restaurant prep forecasting and Jev simulation prototype

> Seeded by the Frontira David when this project was provisioned.
> It's yours now — edit it freely; it exists to give coding agents the context to
> work here productively.

## Tech stack
- **GitHub** — this repository.
- **Vercel** — frontend hosting / deploys (push to `main` deploys).
- **Supabase** — Postgres + auth. Connection details live in the project's environment variables, never committed here.
- **LLM**: model inference. The platform vaults the project key and pushes it to deployed runtimes (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` per vendor); never committed here. On Vercel it is a sensitive Preview and Production variable, so it is intentionally absent from Development and `vercel env pull`. Local tools need a separate developer supplied key that remains outside the repository.

Scaffolded with a **Next.js 16 + shadcn/ui** baseline (App Router, Tailwind v4, TypeScript strict, Biome).

## Getting started

This is a fresh checkout — `node_modules` is NOT committed. Install before anything else:

```bash
pnpm install      # required first — before dev, lint, tests, or build
pnpm dev          # http://localhost:3000
```

(`pnpm dev` guards against a missing install and tells you to run `pnpm install`.)

If a CSS/token change isn't showing despite the edit being on disk, the dev-server
cache is stale — `rm -rf .next && pnpm dev` (don't fight HMR).

## Lifespan
Expected end-of-life: **2026-10-05**. Treat this as a time-boxed prototype — favor speed and simplicity over long-term hardening unless the owner says otherwise.

## Working in this repo (defaults — edit freely)
Sensible defaults David seeds. Not law: if you prefer a lighter process,
edit or delete this section.

- **Ticket → branch → PR → review → merge.** Every change starts from a ticket,
  lands on a branch, and merges only via a reviewed pull request. No direct
  commits to `main`; no merge without a review.
- **Conventional commits** (`feat:`, `fix:`, `chore:` …); short branch names
  (`feat/12-add-login`).
- **Green before review:** types pass, linter clean, tests pass, build succeeds.
- **Tests for behavior:** cover logic with unit tests; prefer red-green for
  anything non-trivial.

## Agent worker approval

The `agent:ready` label is a human approval gate. Agents may prepare or revise a task, but must
never add, infer, or request that label on a human's behalf.

## Migration tests

Do not assert on the text of a migration. `assert.ok(sql.includes("..."))` can only prove a
string appears in a file you wrote. A statement appended later can undo an earlier one while the
earlier text remains, and a commented out statement still contains its own text. Apply the
migration and query the realized schema: column types, constraints, indexes, policies, and
triggers. Then assert on what the database reports.


## Design system profile

This repository was seeded with design profile **`frontira-ledger-4-8`**. The exact package, application contract, source commit and integrity are recorded in `design-system.lock.json`; profile-specific usage lives in `DESIGN_SYSTEM.md` when the profile provides it. Keep the lock committed and upgrade it only through a reviewed change.

Reference:

**https://david.frontira.io/design**


## When the fault is not in this repo

This project was provisioned by Frontira David, so some failures you hit here are defects in the
platform rather than in this code. Telling them apart is worth a moment: a platform defect
worked around silently here will hit every project provisioned after it.

**It is probably the platform, not this repo, when:**

- an environment variable the stack should have provided is missing or empty in a deployed runtime
- a credential that should be configured does not authenticate
- a provider was requested for this project but nothing was provisioned for it
- the design-system version on disk does not match the profile this repo records
- the deployment exists but was never wired to the database, queue or model it needs
- the **agent harness** itself is a different repository: a wrong check command, the sandbox, the catalog or the issue form belongs to `Frontira/frontira-forge`, not to the platform

**File it, then keep working.** This is advisory, not a stop signal:

```bash
gh issue create --repo Frontira/frontira-david \
  --title "<one line: what broke, from this project's point of view>" \
  --body "Project: itch-prep-sim (bab55a5f-82ce-4844-a952-20ad557fdeb2)
Area: <e.g. supabase env vars, llm credential, scaffold>
Expected: <what the platform should have provided>
Actual: <the exact error, verbatim>
Impact: <what it blocks here, and the workaround applied>"
```

**Do not deduce Expected and Actual from the platform's source code.** A real report did exactly
that, reasoned correctly from code it had read correctly, and was still wrong about the one thing it
was reporting. Your runner is served the project's provisioned shape, which providers actually have
live resources and whether the LLM key is vaulted, so ask for those facts and state them. If you
cannot get them, say in the issue that the state is unverified rather than presenting a deduction as
an observation.

Include the project id. It is the only join back to the provision that produced the defect, so
an escalation without it cannot be traced to a cause.

Then apply the **smallest** workaround that unblocks you, and say in your pull request what you
worked around and which issue tracks it. Do not stop and wait.

**Two things never to do**, because each turns a visible defect into an invisible one:

- **Never commit a credential**, in any file, for any reason. Ask for it to be provisioned.
- Never hardcode a value to route around a missing environment variable. Read it from the
  environment and fail loudly when it is absent, so the gap stays legible after you move on.


---
_Managed in Frontira David: https://david.frontira.io/projects/bab55a5f-82ce-4844-a952-20ad557fdeb2_
