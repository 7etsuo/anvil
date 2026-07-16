# Gravewake implementation status and plan

**Title:** Gravewake

**Genre:** Diablo-like action RPG

**Engine:** Anvil only

**Project form:** schema-v2 manifest, intent, compiled immutable IR

## Current state

The original M9 vertical slice has grown into a playable five-area campaign
and endless post-boss loop. Gravewake is also the reference implementation for
M10 authoring and M11 declarative ARPG APIs.

| Capability | Status |
|------------|--------|
| Browser and headless title module | Implemented |
| Schema-v2 intent/content compilation | Implemented |
| Shared Node/browser IR materialization | Implemented |
| Fixed hub plus procedural overworld/three dungeons | Implemented |
| Connected required landmarks and path feedback | Implemented/tested |
| Click/WASD combat, two abilities, potion, resources | Implemented |
| Timed packs, elites, three bosses, endless threat | Implemented |
| Level-100 progression and skill choices | Implemented |
| Item-level loot, paper doll, 32-slot bag | Implemented/tested |
| Vendor, crafting, sockets, gems, shrines, chests | Implemented |
| Quest/campaign rules and authoring provenance observation | Implemented/tested |
| Periodic/event run-state save and reload restore | Implemented |
| Production web build and title-local quality commands | Implemented |
| In-session death restart | Not implemented; reload latest save |
| Cinematics and multiplayer | Not implemented |
| Generic `anvil new --genre arpg` workflow | Engine M11 integration pending |
| Complete repository gate | Not green due to pending engine CLI tests |

## Authority for changes

| Question | Source |
|----------|--------|
| Intended player experience | [`../game.spec.yaml`](../game.spec.yaml) |
| Areas, actors, items, loot, progression, rules | [`../content/`](../content/) |
| Current game behavior | [`../src/`](../src/) and [`../browser/`](../browser/) |
| Engine contract | [`../../../anvil/ENGINE.md`](../../../anvil/ENGINE.md) and design specs |
| Commands and controls | [`../README.md`](../README.md) |
| Current numbers | [`PROGRESSION.md`](./PROGRESSION.md) |

Historical bible documents are not locked runtime specifications. If reviving
an old idea, first update the intent/current operational docs and then
implement it through public Anvil APIs.

## Next work, in order

1. Keep title tests, typecheck, lint, and production web build green.
2. Add a real in-session death recovery path and align the executable intent
   and scenario coverage with it.
3. Playtest and tune authored progression, loot, pack density, and boss threat
   without hard-coding title balance into Anvil.
4. Close engine M10/M11 generic CLI/scaffold gaps so another ARPG can reproduce
   the architecture without copying Gravewake-local setup.
5. Add content only after updating the current intent/data contracts; promote
   any reusable missing mechanic into Anvil first.

## Quality gates

```bash
cd games/gravewake
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build:web
```

The title test command covers content compilation/provenance, procedural
connectivity, progression, loot item levels, and scenario play. The complete
repository gate remains tracked in Anvil's current gap register.
