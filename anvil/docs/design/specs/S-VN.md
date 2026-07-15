# Spec: genre-vn (complete behavior)

**Milestone:** M5

## 1. Script graph grammar

```ts
type VnNode =
  | { id: string; type: 'line'; speaker: string; text: string; portrait?: string; bg?: string; next: string }
  | { id: string; type: 'choice'; prompt: string; options: { text: string; next: string }[] }
  | { id: string; type: 'jump'; next: string }
  | { id: string; type: 'end'; endingId: string }
```

File: `content/scripts/<id>.json` with `{ "start": "nodeId", "nodes": VnNode[] }`

## 2. Runtime

- Current node pointer  
- line → advance on `confirm`  
- choice → options mapped to actions `choice_0`..  
- end → emit `vn:ended` with endingId  

## 3. Rendering

- Fullscreen bg sprite or greybox  
- Portrait bottom-left  
- Text box code-drawn  
- Choice list  

## 4. Tests

- Linear script reaches end  
- Branch A vs B different endingId  
