# AGENTS.md — AgriBot

## What is this

Next.js 16 + React 19 chatbot that helps small farmers diagnose crop problems. Demo flow: photo upload → Vision API analysis → guided options → diagnosis with KB-backed answers.

## Commands

```
pnpm dev          # start dev server (Next.js)
pnpm build        # production build (note: TS errors are ignored via next.config.mjs)
pnpm start        # run production build
```

No lint, typecheck, or test scripts exist. `ignoreBuildErrors: true` in `next.config.mjs` means the build will succeed even with TS errors.

## Project structure

- `app/page.tsx` — Single page: WelcomeScreen → AgriBotChat.
- `app/api/analyze/route.ts` — OpenAI Vision endpoint (gpt-4o). Sends photo, returns `{plant, symptom, severity}` JSON. Falls back to mock data without API key.
- `app/api/diagnose/route.ts` — OpenAI diagnosis endpoint (gpt-4o-mini). Takes plant info + KB match + region/duration, returns formatted diagnosis. Falls back to KB-only answer without API key.
- `app/api/chat/route.ts` — Generic chat endpoint for free-text follow-ups. Falls back to canned responses.
- `components/agribot-chat.tsx` — Main orchestrator. State machine: idle → analyzing → options_shown → followup_region → followup_duration → answering → done.
- `components/quick-options.tsx` — 4-button grid: Diagnose, Treatment, Prevention, Expert.
- `components/confidence-badge.tsx` — Visual confidence indicator (green/amber/red).
- `components/followup-questions.tsx` — Region select + duration select prompt cards.
- `components/expert-panel.tsx` — Phone number + WhatsApp/Call buttons.
- `lib/types.ts` — Shared types: `FlowState`, `PlantAnalysis`, `KBEntry`, `QuickOption`, `ChatMessage`.
- `lib/knowledge-base.ts` — 15 curated entries. `matchKB(plant, symptom)` returns best match. `getRegionNote()` for climate-specific advice.
- `lib/agribot-engine.ts` — Legacy client-side engine (kept for backwards compat, not used in demo flow).

## Demo flow

1. User uploads photo → `/api/analyze` (Vision) → `{plant, symptom, severity}`
2. Bot: "I see a tomato with yellow spots" + 4 quick options
3. User taps "Diagnose" → region prompt → duration prompt → `/api/diagnose`
4. Bot: diagnosis with confidence badge
5. Other options: Treatment (KB steps), Prevention (KB tips), Expert (phone number)

## The 3 prompts (used in report)

**Prompt 1** — Photo analysis (`/api/analyze`):
```
Describe this plant photo. Reply as JSON only:
{"plant": "...", "symptom": "...", "severity": "mild|moderate|severe"}
```

**Prompt 2** — Slot filling (client-side in `agribot-chat.tsx`):
```
Farmer said: "{message}". Current info: {state}.
Ask ONE short question to get the most important missing info.
Missing options: region, duration, affected leaves.
Reply with just the question.
```

**Prompt 3** — Final diagnosis (`/api/diagnose`):
```
Plant: {plant}
Symptom: {symptom}
Region: {region}
Duration: {duration}
KB match: {kb_entry}

Write the diagnosis. Format:
1. Likely cause (confidence: high/medium/low)
2. What to do now (max 3 steps)
3. Prevention (max 2 steps)
4. When to escalate

Simple words. Under 100 words. Never guess.
```

## Key conventions

- **shadcn style**: `base-nova` with `lucide` icons. Config in `components.json`.
- **Path alias**: `@/*` maps to project root (`tsconfig.json` paths).
- **Tailwind v4**: CSS-based config via `app/globals.css` (`@import 'tailwindcss'`), PostCSS plugin `@tailwindcss/postcss`.
- **Env**: `OPENAI_API_KEY` in `.env.local`. All 3 API routes gracefully degrade without it (mock/KB-only responses).
- **Runtime**: All API routes use `runtime = "nodejs"` (not edge).

## Gotchas

- `pnpm-lock.yaml` and `package-lock.json` both exist — pnpm is the intended package manager (`packageManager` field).
- Build does not catch type errors. Don't rely on `pnpm build` as a typecheck.
- Vision API uses `gpt-4o` (not `gpt-4o-mini`) for image analysis. Diagnosis uses `gpt-4o-mini`.
- The `matchKB()` function does simple keyword scoring — not semantic matching. Entries with `plant: "other"` are catch-alls.
- `diagnosis-card.tsx`, `followup-menu.tsx`, `quick-menu.tsx` are orphaned (not rendered in demo flow). Safe to ignore or delete.
