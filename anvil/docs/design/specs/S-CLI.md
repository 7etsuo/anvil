# Spec: CLI (`@anvil/cli`)

**Milestone:** M1+ · **ACI** `05`

## 1. Binary

`anvil` → Node CLI. Cwd MUST be treated as project unless `--root` given.

## 2. Commands (complete)

| Command | Args | Exit 0 when | Output |
|---------|------|-------------|--------|
| `version` | | always | version string |
| `new <name>` | `--genre none\|card\|...` `--root <dir>` | scaffold ok | path printed |
| `validate` | `[path]` `--json` | ok or warnings only | ValidationResult |
| `dev` | `[path]` `--port` | server starts | URL |
| `test` | `[path]` `--seed` `--strict-assets` `--json` | all tests pass | TestReport |
| `observe` | `--json` `--shot` `--root` | snapshot written | ObserveSnapshot path/stdout |
| `assets missing` | `[path]` `--json` | always (list) | paths |
| `recipe list` | | | ids |
| `recipe show <id>` | | | files YAML/JSON |
| `build` | `[path]` `--out` | M6+ static emit | out dir |

## 3. Sandbox

- All paths resolved under `--root` or cwd game root  
- Refuse to write outside root (`IO_ERROR`)  
- Recipes MAY only describe files under game root  

## 4. Staging of `new --genre`

| Milestone | Allowed genres for `new` |
|-----------|--------------------------|
| M1 | `none` only |
| M3 | + `card` |
| M4 | + `topdown2d` |
| M5 | + `vn` `shmup` |
| M7 | + `fps2` |

Unknown genre → `INVALID_ARGS`.
