# Spec: genre-shmup (complete behavior)

**Milestone:** M5

## 1. Player

- Move in bounds clamp  
- Fire on `shoot` cooldown  
- Lives default 3; hit → life-- ; i-frames  

## 2. Waves

```json
{
  "id": "w1",
  "t": 0,
  "spawns": [{ "enemy": "popcorn", "x": 100, "y": -20, "pattern": "down" }]
}
```

Timeline: when battle time ≥ t, spawn.

## 3. Bullet pattern DSL v1

| pattern | params | behavior |
|---------|--------|----------|
| `down` | speed | vel (0, speed) |
| `aim_player` | speed | direction to player at fire |
| `fan` | speed, count, spreadDeg | equal angles |

## 4. Collisions

- Player bullet vs enemy → damage enemy  
- Enemy bullet vs player → damage player  
- Enemy body vs player → damage  

## 5. Win/lose

- Win: all waves done and no enemies left  
- Lose: after hit resolves, if `lives <= 0` → lose  


## 6. Tests

- Wave spawns at t  
- Bullet hits enemy  
- Player death on lives  
