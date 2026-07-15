# Release and Versioning

## Packages

All `@anvil/*` share monorepo version until publish split: start `0.1.0`.

## Semver

| Change | Bump |
|--------|------|
| Bugfix, docs | patch |
| New genre/recipe backward compatible | minor |
| CLI rename, observe schema break, remove action name | major |

## Artifacts

- M6: `anvil build` → static `dist/` web  
- No npm publish required until explicit decision (private monorepo OK)  

## Changelog

`anvil/CHANGELOG.md` — Keep a Changelog format; update each milestone exit.
