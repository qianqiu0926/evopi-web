# EvoPi Web

EvoPi is a self-evolving personal assistant prototype built with Vite, React 19, TypeScript, and plain CSS.

## Quick Start

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Local preview:

```txt
http://127.0.0.1:5173/
```

## Scripts

```bash
npm run lint
npm run build
npm run preview
```

## Product Surface

- 今日工作台: daily focus, auto-organized memories, pending confirmations.
- 目标舱: evolving goal workspaces with receipt-style agent progress, PiRoom-style chat, goal-specific snippets, and Skill confirmation.
- 记忆库: categorized memory review and confirmation.
- PiRoom: simulated perspective chat with attachable assets.
- 技能中心: installed skills and skill recommendations.
- 进化日志: co-evolution loop, mind map, and user evolution notes.
- 隐私权限: collaboration depth and data permission controls.

## Project Notes

- Main UI: `src/App.tsx`
- Data layer: `src/data.ts`
- App styles and theme behavior: `src/App.css`, `src/index.css`
- Components: `src/components/`
- Local icons: `public/cute-line-icons/`
- PiCore sprite: `public/pet/happydog.webp`

The app uses three themes through `body[data-theme]`: `cute`, `notion`, and `glass`.

## EvoMap Boundary

Do not run EvoMap registration, publish, fetch, heartbeat, or credential persistence unless the current user explicitly authorizes it in that thread. See `EVOMAP.md` for details.
