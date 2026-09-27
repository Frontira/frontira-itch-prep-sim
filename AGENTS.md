# Agent instructions

Read `CLAUDE.md` for this repository's project context, commands, and delivery conventions.

## Agent worker approval

The `agent:ready` label is a human approval gate. Agents may prepare or revise a task, but must
never add, infer, or request that label on a human's behalf.

## Migration tests

Do not assert on the text of a migration. `assert.ok(sql.includes("..."))` can only prove a
string appears in a file you wrote. A statement appended later can undo an earlier one while the
earlier text remains, and a commented out statement still contains its own text. Apply the
migration and query the realized schema: column types, constraints, indexes, policies, and
triggers. Then assert on what the database reports.
