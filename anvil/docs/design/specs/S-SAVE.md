# Spec: Save / Load (REQ-K11)

**Milestone:** M2

## 1. API

See S-CORE §11. Default slot `slot0`.

## 2. What is saved

| Included | Excluded |
|----------|----------|
| scene name, seed, tick | wall clock dependence |
| all entities full component bags | input edges |
| genreState from active genre module | loaded textures |

## 3. genreState contracts

| Genre | genreState keys |
|-------|-----------------|
| none | `{}` |
| card | `{ battle: BattleState }` full |
| topdown2d | `{ mapId: string }` |
| vn | `{ scriptId: string, nodeId: string }` |
| shmup | `{ waveIndex: number, lives: number, score: number, time: number }` |
| fps2 | `{ mapId: string, angle: number }` |

## 4. Load algorithm

1. Read JSON  
2. Validate SaveGame schema  
3. createGame({ root, seed: save.seed, headless })  
4. Clear world; spawn entities from save  
5. scenes.replace(save.scene)  
6. Genre module applyGenreState(save.genreState)  
7. Return handle  

## 5. Tests

- save then load preserves entity hp and position (topdown or empty)  
- corrupt JSON → SCHEMA_INVALID  
- missing file → IO_ERROR  
