# Contributing to Anvil

## Scope and branches

Use a feature branch and keep a change focused on one milestone/task group when
possible. Preserve the engine/game boundary: reusable capability belongs in
`anvil/packages/*`; title content and balance belong under `games/<title>/`.

## Pull request checklist

- [ ] Read the repository/design agent instructions and relevant spec.
- [ ] Mark only genuinely completed tasks in `20_FULL_TASK_BREAKDOWN.md`.
- [ ] Build affected packages and run their targeted tests.
- [ ] Run `validate` then `test` for every touched example/title.
- [ ] Run browser/desktop/net gates when those surfaces change.
- [ ] Run `pnpm lint`; keep Phaser imports inside `render-phaser`.
- [ ] Update public API, CLI, schema, examples, agent docs, and changelog
      together when behavior changes.
- [ ] Record any remaining known failure rather than presenting a partial gate
      as complete.

## Current M10/M11 verification note

The full `pnpm check` currently fails three CLI integration tests for absent
schema-v2/ARPG CLI behavior. That does not authorize skipping or deleting the
tests. A PR completing those tasks must also:

- add authoring and ARPG package tests to the routine scripts/CI;
- migrate or deliberately preserve every example/template with documented
  compatibility behavior;
- update `pnpm anvil --help`; and
- make the full engine plus Gravewake gate green.

## Review requirements

- Agent action/observation breaks require design review and a version note.
- Genre rule changes require the relevant `S-*.md` update.
- Schema, save, IR, or observation protocol changes require explicit migration
  and compatibility notes.
- Renderer/kernel ownership escaping into a game is a blocking architecture
  issue.

Commit subjects should be imperative and may include a milestone prefix.
