# 22 — Release and versioning

## Current version axes

This private monorepo currently exposes three different version values:

| Axis | Current value | Meaning |
|------|---------------|---------|
| Workspace/package manifests | `0.1.0` | Private package metadata |
| `ANVIL_VERSION` | `0.7.0` | Runtime/CLI/observe engine version |
| Authoring capability descriptors | `0.9.0` | Internal descriptor version |

They are not interchangeable. Documentation and tests should name the axis
they refer to. Reconcile them as an explicit release task before external npm
publication; do not silently bump only one value.

## Release status

- M1–M9 behavior forms the current stable runtime baseline.
- M10/M11 libraries are present but their milestones are unreleased/incomplete
  because the generic CLI/scaffold/gate acceptance conditions do not pass.
- The repository is private and no npm publication is currently required.

## Semantic version policy

| Change | Minimum bump once packages are published |
|--------|------------------------------------------|
| Documentation-only fix or compatible bug fix | patch |
| Backward-compatible system, recipe, genre, or CLI command | minor |
| Removed/renamed public API, command, action, content field, or observation contract | major |

Project manifest `schemaVersion`, authoring `irVersion`, observe snapshot
`schemaVersion`, save schema, and package semver are independent protocols.
Changing one requires migration/compatibility analysis; it does not imply that
the others should receive the same numeric value.

## Release artifacts and gates

- `anvil build` emits a static web distribution.
- `@anvil/desktop` packages an existing web distribution in Electron.
- Release readiness requires the complete documented gate to pass, including
  authoring/ARPG tests and the active Gravewake build.
- Update [`../../CHANGELOG.md`](../../CHANGELOG.md), specs, task status, CLI
  help, and examples in the same release change.

The changelog uses Keep a Changelog-style sections. Do not mark pending M10/M11
work as released until its CLI integration tasks are complete.
