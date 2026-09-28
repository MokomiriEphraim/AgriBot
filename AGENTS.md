# AgriBot

AI agronomy chat assistant for small farmers. Single Next.js 16 App Router app (not a monorepo), v0.app-scaffolded, Tailwind v4, shadcn `base-nova`. OpenAI (`gpt-4o` vision/chat, `gpt-image-1`) + MongoDB (`agribot_db`).

## Commands

- `packageManager` is `pnpm@12.3.4` but **`pnpm` is not on PATH in this sandbox**. Use `corepack pnpm <cmd>` (corepack 0.34.6 installed; downloads pnpm on first call, so it needs network) or `npx pnpm`.
- `corepack pnpm dev` — dev server on :3000. `corepack pnpm build` / `start`.
- **No lint, test, or typecheck script exists**, and no eslint/vitest/jest/playwright binary is installed. Verification is `npx tsc --noEmit` then `npx next build`.
- Two lockfiles are committed (`package-lock.json`, `pnpm-lock.yaml`). Only `pnpm-lock.yaml` is maintained by history — don't regenerate or commit `package-lock.json`.
- `eslint-disable` comments and `// @ts-expect-error` in source are load-bearing only for `tsc`; there is no eslint to satisfy.

## The build does not typecheck

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`; `next build` prints `Skipping validation of types` and exits 0 with type errors present. `npx tsc --noEmit` is the only real gate.

Baseline is **3 pre-existing errors** — don't attribute them to your change, don't fix them unless asked:
`components/diagnosis-card.tsx:51` (implicit-any ×2), `lib/agribot-engine.ts:5` (`KBEntry` not exported from `knowledge-base`).

## Environment

`.env.local` is the only env file Next loads, and it is gitignored. **Every env var fails soft, so a missing key looks like a broken prompt/model rather than a config error — check keys first.**

- `OPENAI_API_KEY` — unset ⇒ `/api/chat` streams hardcoded markdown from `generateSmartFallback` (`app/api/chat/route.ts:190`) and `/api/forecast` leaves the `createPlantVisualFallback` SVG data-URIs in place instead of generating images. No error is raised. The fallback path *does* still persist both turns to Mongo.
- `MONGODB_URI` — unset ⇒ every `lib/mongodb.ts` helper returns `null`/`[]`. History, device registration, **and rate limiting are silently disabled** (`checkRateLimit` fails open), so image generation becomes unmetered.
- `APP_MODE` — selects the quota table in `lib/rate-limit.ts:31` (`image_generation`: 10/24h dev, 5/24h production). Falls back to `NODE_ENV`, so set it explicitly when testing production limits.

## Architecture

`app/page.tsx` is a `WelcomeScreen` gate over `components/agribot-chat.tsx:79`, which owns the **entire** message list, streaming, localStorage cache, and forecast triggering. Everything else in `components/` is presentational — don't scatter new chat state elsewhere.

Note `app/page.tsx`'s `started` flag is **not persisted**, so every reload shows `WelcomeScreen`; the "instant paint" cache below is invisible until the user taps Start. `AgriBotChat`'s `onBack` prop is accepted and never used.

**Dead v0 scaffolding — do not treat as live app code.** 9 components are imported by nothing: `chat-header`, `confidence-badge`, `diagnosis-card`, `expert-panel`, `followup-menu`, `followup-questions`, `question-group`, `quick-options`, `assistant-ui/elements/streaming-text`. `lib/types.ts` (`ChatMessage` is a *different, unused* shape from the local `Message` in `agribot-chat.tsx:15`), `lib/knowledge-base.ts`, and `lib/agribot-engine.ts` are reachable only from those plus `/api/diagnose`. Two of the three baseline `tsc` errors live in this dead code.

**Two message stores, hand-synced:**
- `localStorage` key `agribot_chat_cache_v2_<deviceId>` (`CACHE_KEY_PREFIX`, `agribot-chat.tsx:77`) for 0ms paint.
- MongoDB `messages` collection for durable history.

Mongo wins on load, and the two disagree. `getDeviceHistory` sorts `{createdAt: 1}` then `.limit(40)` (`lib/mongodb.ts:181`), so `/api/session` returns the **40 oldest** messages, not the newest — past 40 turns, Mongo never contributes the recent ones. It also doesn't map `progression`, so **forecast cards vanish on reload** (the `forecasts` collection is written but never read back). Changing the `Message` shape breaks historical data — bump `CACHE_KEY_PREFIX`, since stale caches are not version-validated.

**`deviceId` is not auth.** It's a random browser-local id (`lib/device.ts`, key `agribot_device_id`) that keys every collection and the rate limiter. Clearing localStorage orphans that user's history and resets their quota.

**Images are never uploaded as files.** Photos become client-side base64 data URLs (`components/chat-input.tsx:41`) sent inline in the JSON body to OpenAI. Base64 crops and forecast PNGs are persisted into `messages.image` / `forecasts`, so Mongo's 16MB document cap applies.

## API routes (`app/api/*`)

Live (fetched by `agribot-chat.tsx`): `chat`, `forecast`, `session`, plus read-only `rate-limit`.
**Dead — never fetched by any client:** `analyze` (returns a hardcoded mock tomato without a key), `diagnose`, `history` (reads a `conversations` collection nothing writes).

- `chat` — streams raw `text/plain` chunks (not SSE, not JSON). Client reads via `res.body.getReader()` (`agribot-chat.tsx:243`). Note the `m.role === "bot" → "assistant"` branch at `route.ts:106` is **dead** — the client already maps at `agribot-chat.tsx:230` before sending.
- `forecast` — the 14-day "time machine": gpt-4o Vision JSON extraction when an `imageUrl` is present, else a text-only `context` extraction, else **no LLM call at all** and a degenerate `"Crop"`/`"Crop condition"` result. Then two `gpt-image-1` generations in parallel via `Promise.allSettled`, each falling back independently to the SVG. `maxDuration = 120`.
- `session` — `POST` registers the device and returns history; `DELETE ?deviceId=` wipes it (used by "+ New Chat"). Registration and history fetch are `Promise.all`'d.
- `rate-limit` — `GET /api/rate-limit?deviceId=...` (the param is required); handy for checking quota by hand.

Every OpenAI route pins `export const runtime = "nodejs"` — don't move these to the edge. `maxDuration` is set per route (60 or 120) and is required for serverless; don't drop it.

## Styling / UI

- Tailwind v4 with **no `tailwind.config.js`**. Theme tokens are CSS-first in `app/globals.css` (`@theme inline` + `:root`/`.dark`). Dark mode is class-based via `@custom-variant dark (&:is(.dark *))`.
- shadcn style is `base-nova`; add with `npx shadcn add <name>`. Only `components/ui/button.tsx` is vendored — don't assume other shadcn components exist. Aliases: `@/components`, `@/lib/utils`.
- `images.unoptimized: true`, so plain `<img>` for user photos and `next/image` `sizes` hints have no effect.
- Bot text renders through `ReactMarkdown` (`components/chat-message.tsx`). System prompts lean on markdown headers/bullets for on-phone readability, and emoji are load-bearing in `generateSmartFallback`.

### The app is a phone app that grew a desktop layout

The 440px phone frame in `app/page.tsx` is the primary product. Desktop is a `lg:` (1024px+) enhancement layered on top, and the `lg:` prefix is load-bearing — **anything without it changes the phone view.**

- `app/page.tsx` frame: `max-w-[440px]` + `sm:max-h-[900px]` everywhere, relaxed only at `lg:max-w-none lg:max-h-none`.
- `AgriBotChat`'s root is `flex-col` and becomes `lg:flex-row`. The desktop sidebar is `<aside className="hidden ... lg:flex">` — it lives inside `AgriBotChat` (not `page.tsx`) specifically so it can reach `resetChat` / `handleCategory` / `handleOther`. `hidden` below `lg` means zero mobile impact.
- A `<div className="flex min-h-0 min-w-0 flex-1 flex-col">` wrapper holds the scroll area + input. It changes mobile DOM structure but is provably layout-identical (same flex basis, `h-full` parent) — don't "simplify" it away without re-verifying.
- Message and input columns are `lg:max-w-3xl lg:mx-auto`. On ultrawide the chat is still capped at 768px so text lines stay readable.

**Verify any styling change against both.** Capture geometry with headless Chrome + CDP and diff before/after:
`google-chrome --headless --remote-debugging-port=9222` → drive `Runtime.evaluate` / `Emulation.setDeviceMetricsOverride`, walk the DOM recording `{tag, rect, display, flexDirection, maxWidth, fontSize}` per element. **Compare the multiset of those signatures, not DOM paths** — inserting a wrapper renumbers every path and will look like a total rewrite while the render is identical. Assert `documentElement.scrollWidth <= clientWidth` at 900 / 1024 / 1440 / 1920 / 2560 px.

## Language support

`lib/language.ts` is the single source of truth for the 11 written official SA languages (English, Afrikaans, isiNdebele, isiXhosa, isiZulu, Sepedi, Sesotho, siSwati, Setswana, isiXitsonga, Tshivenda). SASL is excluded — no written form.

- **The model does the mirroring**, via `buildLanguageRule()` appended per-request in `/api/chat`. `detectLanguage()` is only a hint for short/ambiguous messages; never treat it as authoritative.
- Marker threshold is 2 hits (`MIN_SCORE`) and falls back to `en`. Without it, English scores a structural zero and one ambiguous token drags a message into Afrikaans. English needs its own marker list for this reason.
- `*` prefix on a marker = match as a **stem** (trailing boundary only). isiXhosa/isiZulu class prefixes mean "ithanga" also appears as "iithanga"; a leading word boundary rejects the stem entirely.
- Tie-breaks are deterministic (marker-hit count → matched-character weight → code). Removing them makes results depend on object key order.
- **The canonical-English-crop-name rule is load-bearing, not cosmetic.** `hasCropContext` only matches English keywords, so the prompt must force "ithanga (tomato)". In `/api/forecast` the same rule keeps `crop`/`visualDescription` English because they feed gpt-image-1 and the SVG — the model will otherwise return "iithanga" and degrade the artwork.
- Phrase the forecast hint as a **default**, never an instruction. Stating "the farmer speaks English" as an instruction makes the model comply with a wrong guess and overrides the message it can plainly see.
- The no-API-key fallback (`generateSmartFallback`) is deliberately **not** translated — it holds real dosing advice. Hand-translating 11 languages would ship content nobody can verify. It labels itself as a stub instead.


## Gotchas

- The "Predict 14-Day" buttons are gated by `hasCropContext()` (`agribot-chat.tsx:30`), a hardcoded substring keyword list plus "any image in the conversation". Rewording bot output can silently hide them.
- Rate limiting only engages `if (apiKey && deviceId)` (`app/api/forecast/route.ts:289`), and `recordUsage` is called once per *successful forecast*, not per image — so the two generated images cost one unit of quota.
- The assistant turn is persisted only after the stream finishes (`app/api/chat/route.ts:164`). A dropped connection saves the user turn but not the bot turn, so history desyncs.
- Commit messages follow Conventional Commits with scopes: `fix(chat):`, `perf(history):`, `feat(prognosis):`.
