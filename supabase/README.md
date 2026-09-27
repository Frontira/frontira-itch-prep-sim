# Database (Supabase)

This project keeps its **entire database schema as ordered SQL migrations** under
`supabase/migrations/`. This is deliberate:

- The schema is reproducible — anyone can stand up an identical database by
  running the migrations against a fresh Supabase project.
- It makes a future change of hosting (e.g. moving from a Frontira-owned Supabase
  organisation to the client's own) a **"create project → run migrations → copy
  data"** operation, instead of reverse-engineering a live database.

## Rules

1. One migration per schema change. Files are applied in filename order.
2. **Never edit a migration that has already been applied** — add a new one.
3. Keep migrations idempotent where practical (`create ... if not exists`, etc.).

## Common commands

```bash
supabase migration new <name>   # scaffold the next migration
supabase db reset               # re-apply every migration from scratch (local)
supabase db push                # apply pending migrations to the linked project
```
