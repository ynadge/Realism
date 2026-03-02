# Realism — Current State

Last updated: 2026-03-02

## Stack (what's actually running)

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth tokens | JWT via `jose` — cryptographic validation, zero Redis per request |
| Auth verification | Sapiom Verify (Prelude) — phone OTP only (email returns 502) |
| Orchestrator | Claude via Sapiom OpenRouter — Vercel AI SDK `generateText` with tool calling |
| Job queue | Inngest — background execution with 10-minute timeout, retries, visual traces |
| All data storage | Direct Upstash Redis (`@upstash/redis`) — jobs, artifacts, spend events, session blocklist, SSE events |
| Cron scheduling | QStash via Sapiom Messaging — persistent job schedules only |
| Governance | Sapiom spending rules (best-effort — budget also enforced in orchestrator prompt) |

## What's been built

- **000 — Project Bootstrap:** Next.js scaffold, dependencies, types, folder structure. Deviated: ended up on Next.js 16 (ticket said 14).
- **001 — Design System Primitives:** Atmosphere (noise + mesh), LiveDot, MonoLabel, SurfaceCard, fade-up animations.
- **002 — Core Library Files:** `lib/sapiom.ts`, `lib/redis.ts`, `lib/auth.ts`, `lib/jobs.ts`, `lib/classifier.ts`. All typed wrappers.
- **002.5 — Redis Provisioning + Transport Fix:** Switched redis.ts from `@upstash/redis` to Sapiom HTTP Redis via `@sapiom/axios`. Now superseded by R-C.
- **003 — Auth API Routes:** `/api/auth/send`, `/api/auth/verify`, middleware protecting `/dashboard`, `/job/*`, `/live/*`.
- **004 — Auth UI (AuthModal):** Phone + email OTP modal. Email toggle built but email delivery broken server-side (Sapiom 502).
- **005 — Job Creation API:** `/api/jobs/create` with goal classification, spending rule creation, QStash scheduling for persistent jobs.
- **006 — The Orchestrator:** Agentic tool-calling loop, system prompt, artifact parsing with JSON repair and three-level fallback.
- **007 — Landing Page:** Goal input with budget slider, once/recurring toggle, example goals, auth check.
- **008 — Live Job View:** JobStream (tool call feed), SpendMeter, ArtifactViewer (document/audio/image/mixed), Receipt.
- **009 — Dashboard:** Running persistent jobs as cards, completed jobs as history list, pause/cancel actions.
- **009.5 — Performance Foundation:** JWT auth (replaced Redis sessions), direct Upstash for hot-path (session blocklist + SSE events), restored SSE streaming.
- **R-A — Orchestrator Rewrite:** Replaced hand-rolled agentic loop (~400 lines) with Vercel AI SDK `generateText` + tool definitions (~200 lines). Kept artifact parsing.
- **R-B — Job Queue Rewrite (Inngest):** Replaced QStash worker dispatch with Inngest for on-demand execution. QStash stays for cron only. Added `lib/inngest.ts`, `lib/inngest-functions.ts`, `/api/inngest` route.
- **R-C — Redis Consolidation:** Replaced Sapiom HTTP Redis with direct Upstash Redis for all data. Removed `@sapiom/axios`, `SAPIOM_REDIS_URL`. One Redis client for everything.
- **010 — Live Mode Foundation:** `types/live.ts` (all Live mode types), `lib/live-apps.ts` (CRUD for app configs, bundles, data plans, cache, connector credentials, slug generation). Push subscription functions added to `lib/redis.ts`. Re-export via `types/index.ts`. Redis key schema verified against live Upstash.
- **011 — Connector System Foundation:** `connectors/types.ts` (interface — imports DataItem + ConnectorCredentials from `@/types`, no duplication), `connectors/reddit.ts` (3 methods: hot_posts, new_posts, search_posts), `connectors/rss.ts` (dependency-free regex XML parser for RSS 2.0 + Atom), `connectors/index.ts` (registry + helpers), `lib/connector-manager.ts` (runtime execution with credential loading and graceful error handling). Both connectors live-tested against real APIs.
- **012 — Spotify Connector + OAuth:** `connectors/spotify.ts` (5 methods: top_tracks, recently_played, artist_info, new_releases, related_artists + token refresh), `/api/connectors/spotify/auth` (OAuth initiation), `/api/connectors/spotify/callback` (token exchange + credential storage), `/api/connectors/status` (connector status for all connectors). Registry now has 3 connectors.
- **013 — Design Personality System:** `lib/design-personalities.ts` with 5 personalities (Terminal, Editorial, Tool, Brief, Clean), each with full design directives, color schemes, typography, layout, and motion specs. Keyword classifier maps goals to personalities. `lib/classifier.ts` extended with `classifyLiveGoal` returning design personality, suggested connectors, and personal context fields. Classification test: 5/5 first run.
- **014 — Creation Orchestrator: Plan + Verify:** `lib/live-orchestrator.ts` with `planLiveApp()` (LLM-powered DataPlan generation) and `verifyDataPlan()` (parallel fetch validation with fallback). Uses `sapiomSearch(q, 'deep')` not separate `sapiomDeepSearch`. Plan quality verified: targeted queries, appropriate cacheTTLs, descriptive fetch IDs, specific synthesis prompts. All 3 demo goals produce valid plans. Verify step returns real data. Fallback handles nonsense goals gracefully.

## Key decisions made

- **JWT over Redis sessions (009.5):** Session validation was 100–300ms per request via Sapiom HTTP Redis. JWT verification is <1ms with zero network calls. Logout uses a small Upstash blocklist.
- **Direct Upstash over Sapiom Redis (R-C):** Sapiom's HTTP Redis added x402 negotiation overhead, URL-length limits, and pipeline workarounds. Direct Upstash uses native protocol — same underlying database, correct client.
- **Inngest over QStash for execution (R-B):** QStash dispatch required a worker route that ran inside Vercel's 60-second timeout. Inngest runs jobs for up to 10 minutes with visual traces and retries. QStash still handles cron scheduling.
- **`generateText` over `streamText` (R-A):** The orchestrator uses `generateText` because it runs in an Inngest background function, not in an SSE response handler. SSE streaming happens separately via Upstash polling.
- **Spending rules are best-effort:** Sapiom's governance API has undocumented enum constraints. Rule creation is non-blocking; budget enforcement happens in the orchestrator's system prompt.
- **Phone-only auth for now:** Email verification documented by Sapiom but returns 502. Phone OTP works. Email UI is built and ready.

## Known issues

- **Email verification broken:** Sapiom's Prelude proxy returns 502 for email verification requests despite documenting email as supported (Sapiom_feedback #14).
- **Prelude "blocked" status:** Phone verification can return an undocumented `"blocked"` status with a 200 OK — silently fails to send SMS (Sapiom_feedback #13). Workaround: explicit status check, return 429 to client.
- **No data migration:** Jobs created before R-C (in Sapiom HTTP Redis) are not accessible from direct Upstash. Old test data is lost.
- **`concurrently` missing from devDependencies:** The `dev:all` script uses it but it's not in package.json.

## Active debt

- **Three Upstash clients:** `lib/redis.ts`, `lib/upstash.ts`, and `lib/live-apps.ts` each create separate `@upstash/redis` instances pointing at the same database. Should be consolidated into a shared singleton.
- **Push notifications not implemented:** Architecture doc specifies Web Push + PWA (VAPID, service worker, web-push npm) but none of it is built yet. Push subscription Redis functions are ready in `lib/redis.ts`.
- **Live apps: plan + verify built, no code gen or UI yet.** Types, Redis CRUD (010), connectors (011–012), design personalities (013), plan + verify orchestrator (014) done. Code generation (015), data API (016), and UI (017–019) remain.
- **All three v1 connectors built (Reddit, RSS, Spotify).** OAuth flow complete. Token refresh persistence deferred to Ticket 016 (data API). State parameter signing deferred to pre-launch.

## What's next

Next: Ticket 015 — Creation orchestrator: code generation step.

## Environment

```
SAPIOM_API_KEY
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
NEXTAUTH_SECRET
NEXT_PUBLIC_APP_URL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
```
