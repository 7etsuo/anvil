# Security model

Anvil processes local project files, browser storage/assets, optional custom
modules, and multiplayer traffic. Local content is not automatically safe just
because it is JSON, and a raw socket demo is not a production trust boundary.

## Threats and controls

| Asset/boundary | Threat | Current control |
|----------------|--------|-----------------|
| Host filesystem | Path traversal through content/assets/migration | Reject unsafe relative paths; containment checks under project root |
| Migration writes | Partial or destructive schema cutover | Temporary files, supporting files first, `game.yaml` commit last |
| Declarative source | Arbitrary code/network execution | Finite Zod schemas; compiler only reads YAML/JSON; no eval/fetch/image generation |
| CLI/recipes | Write outside game/build root | Root-scoped resolution; recipes are descriptors, not shell scripts |
| Browser | Remote code/content injection | Engine does not load remote scripts or eval content; host controls asset origin/CSP |
| Save/storage | Corrupt or incompatible state | Version checks and schema/shape validation; namespaced keys |
| Custom relative modules | Executable untrusted code | Explicit manifest opt-in; treat the module as trusted project code |
| Dependencies | Supply-chain compromise | Lockfile, major/version review, minimal renderer boundary |
| Secrets/logging | Credential disclosure | Never print env secrets, tokens, wallet material, or full secret-bearing config |

## Networking boundaries

- `@anvil/genre-net` has loopback/memory transports and a minimal raw
  WebSocket relay. The relay is unauthenticated and must not be exposed as a
  production Internet service.
- `@anvil/net-colyseus` adds authoritative rooms, validation, reconnect seats,
  health/metrics, and deployment patterns. It still requires TLS termination,
  secret management, rate/abuse policy, operational monitoring, and product
  identity/auth decisions.
- Never trust client position, HP, inventory, rewards, or arbitrary command
  payloads. Clients send bounded inputs; the server owns state.
- Full MMO anti-cheat, matchmaking, durable economy, and account security
  remain out of scope.

## Rules for agents

1. Do not add `eval`, `Function`, shell execution from content, or remote code
   fetches.
2. Do not dynamically import an arbitrary user path without the explicit
   project-module trust boundary and root containment.
3. Keep declarative conditions/effects finite and validated.
4. Preserve transactional migration and save behavior.
5. Do not add image-generation APIs to the engine.
6. Do not weaken server authority or log secrets to make a demo pass.
7. Add tests for path escape, malformed input, and authority checks whenever a
   boundary changes.
