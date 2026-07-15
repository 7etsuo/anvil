# 18 — Testing and CI Plan

**Research:** GameCraft interactive verification; GameGen-Verifier runtime checks; deterministic seeds.

## 1. Test pyramid

| Level | What | Tool | When |
|-------|------|------|------|
| Unit | pure functions, schema parse, effect resolve | Vitest | every PR |
| Integration | kernel + one genre, headless ticks | Vitest | every PR |
| Package | `anvil validate` + `anvil test` on examples | CLI | every PR |
| Manual | `anvil dev` smoke | human/agent | milestone exit |

## 2. Required tests by milestone

| M | Must pass |
|---|-----------|
| M1 | hello-empty launches; validate ok; observe JSON shape; one failing test fixture proves non-zero exit |
| M2 | missing asset greybox; assets missing lists path |
| M3 | hello-card scripted win; schema reject bad card |
| M4 | hello-topdown player moves; enemy damages |
| M5 | vn branch; shmup wave spawn |
| M6 | all examples in CI matrix green |
| M7 | fps2 shoot enemy |

## 3. Determinism

- All scenario tests set `seed`  
- No wall-clock assertions  
- Fixed `dt` in headless  

## 4. CI workflow (GitHub Actions)

```yaml
# conceptual — implement in M1/M6
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm exec anvil validate examples/hello-empty
      - run: pnpm exec anvil test examples/hello-empty
```

Headless browser/canvas: use node canvas or skip screenshot tests in CI until M2; JSON observe always on.

## 5. Coverage

- No hard % gate in M1  
- M6: fail PR if example tests fail (coverage optional)

## 6. Diagram — CI swimlane

```mermaid
sequenceDiagram
  participant Dev
  participant GH as GitHub Actions
  participant PN as pnpm
  participant CLI as anvil CLI

  Dev->>GH: push
  GH->>PN: install lint test
  GH->>CLI: validate examples
  GH->>CLI: test examples
  CLI-->>GH: exit code
  GH-->>Dev: pass/fail
```
