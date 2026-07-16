# Gravewake — active title

**Original decision:** T-M9-001 selected Gravewake as the first Anvil title.
M9 is complete; the title has since become the schema-v2 authoring and
declarative ARPG reference implementation.

| Area | Runtime |
|------|---------|
| Ashen Lychgate | Fixed safe hub, shrine/vendor, crafting, inventory |
| Ashen Wastes | Procedural overworld, timed packs, four travel portals |
| Bellcrypt | Procedural delve and Bellwarden |
| Howling Catacombs | Procedural delve and Death Knight |
| Bonekeep | Procedural endgame delve and Bone Tyrant |

The title uses `@anvil/core`, `@anvil/authoring`,
`@anvil/genre-topdown2d`, and `@anvil/genre-arpg`. The manifest also declares
`./dist/module.js` because the generic CLI ARPG loader is not implemented yet.

Run `pnpm play` here or `pnpm play` from `anvil/`. See [`README.md`](./README.md)
for controls, architecture, tests, and current limitations.
