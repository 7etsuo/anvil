# Security Model (v1 offline engine)

## Threat model

| Asset | Threat | Mitigation |
|-------|--------|------------|
| Host filesystem | Path traversal via content paths | Reject `..` and abs paths; resolve under root |
| Host process | Recipe/CLI writing outside project | Sandbox writes to game root only |
| Browser | Malicious game content | No eval of JSON as code; no remote script load in core |
| Dependencies | Supply chain | Pin majors; review Phaser upgrades |
| Secrets | Logging keys | Never log env secrets; paths only |

## Non-goals v1

- Multiplayer anti-cheat  
- Sandboxing untrusted multiplayer peers  
- CSP hardening beyond Vite defaults  

## Rules for agents

1. Do not add `eval`, `Function(`, dynamic `import` of user paths  
2. Do not fetch remote code in core  
3. Content is data only  
4. Net spike (M8) is loopback-only trust model  
