# Realism

> "If you can think it, you can make it real."

Realism is a goal-execution interface built entirely on [Sapiom](https://sapiom.ai). You describe what you want to exist, and Realism assembles the infrastructure, runs it within a budget you set, and hands you back something real. Not a chat window, or a workflow builder, or a template system. More like a control room.

The whole thing was built by one person in two days, and the total cost from creation to testing to deployment was $30 across seven different services, all through a single API key.

---

[![Watch the demo](https://cdn.loom.com/sessions/thumbnails/bb6c51d1d8cc4e7db500ac6a51728aca-f67f28baefead44f.gif)](https://www.loom.com/share/bb6c51d1d8cc4e7db500ac6a51728aca)

---

## What it actually does

Most AI tools produce text, but Realism produces things.

You type a goal. Realism classifies it, creates a Sapiom spending rule to govern the budget, dispatches an agentic job, and streams every tool call back to you in real time with a cost next to each one. When it finishes, you get a receipt showing exactly what was spent and what was made.

Every capability call flows through Sapiom: web search via Linkup, deep search via You.com, page extraction, image generation via FLUX, audio via ElevenLabs TTS, Claude via OpenRouter, phone OTP verification via Prelude, job scheduling via QStash, and spend governance via spending rules. One API key. One account. One place to see what was spent.

**Three modes:**

**Once** runs a goal one time and produces an artifact. A research briefing with an audio summary. A generated image and pitch. A structured analysis. Whatever the goal needs. When it finishes, you own the output.

**Scheduled** runs a goal on a cadence you choose. A weekly monitor watching for new capabilities. A daily brief on a topic you care about. The job runs in the background, stores its results, and the dashboard shows the latest output whenever you check in.

**Live** generates a real, running personal application. Not a template filled in with your content. A genuinely custom app with a custom UI, live data sources, and personal context baked in. It gets a URL you can bookmark. Every time you visit, it fetches fresh data. It lives as long as you want it to. Live apps can also pull from external services like Reddit, Spotify, and RSS feeds through a connector interface.

---

## Live mode in action

Type something like: *"I want a feed of everything important happening with Bitcoin right now, price context, key narratives, what smart people are saying."*

Realism spends about 60 seconds doing three things. First it plans what data sources the app needs and how often they should refresh. Then it verifies those sources actually return useful data through Sapiom's search and fetch tools. Then it generates a complete HTML application with its own design, layout, and refresh logic, designed specifically for that goal.

The result is a Bloomberg terminal aesthetic. Black background, electric green data, dense panels. Because that is the right design for a financial intelligence feed, and Realism knows that.

Type something different: *"My measurements are chest 38, waist 32, inseam 30. I never know what size to buy for formal wear."*

The result is a utility tool. Clean, functional, two-panel layout. Your measurements are stored as personal context and get interpolated into every Sapiom search query. It fetches size guides from specific retailers on demand and gives you direct answers, not generic advice.

Type: *"I'm into Mk.gee, Men I Trust, and Arca. Make me a page about them and help me find similar artists."*

The result is an editorial magazine layout. Warm off-white background, display serif typography, image-forward. It looks like it belongs next to Pitchfork, not like something a web app generated.

Three different goals produce three genuinely different products. The design personality is classified from the goal, a full design brief is injected into the generation prompt, and Claude produces HTML that matches the brief.

---

## Why Sapiom made this possible

Without Sapiom this project would have required seven vendor accounts, seven billing cycles, seven sets of credentials to manage, and seven dashboards to check when something broke. That friction is where projects like this die during building, because you end up spending more time managing integrations than building the product.

Sapiom replaces all of that with one API key. The agent picks the right service, reasons about when to use it, and pays for it automatically. Every call is metered, every cost is visible, and spend governance keeps things from going sideways.

The full build including all testing, iteration, and failed approaches that got thrown out cost under **$30 in Sapiom credits**. Spending rules acted as circuit breakers during development, so a runaway orchestrator loop couldn't drain the account.

---

## Sapiom services used

| Capability | Sapiom Service | What Realism uses it for |
|-----------|----------------|--------------------------|
| Web search | Linkup | Research, data verification, live app data |
| Deep search | You.com | Comprehensive research for Once mode |
| Page extraction | Fetch | Pulling content from URLs |
| Image generation | FLUX via FAL.ai | Visual artifacts for creative goals |
| Audio | ElevenLabs TTS | Audio summaries and narration |
| LLM inference | Claude via OpenRouter | Orchestration, planning, code generation |
| Phone verification | Prelude | User authentication via OTP |
| Job scheduling | QStash | Scheduled mode cadence execution |
| Spend governance | Spending rules | Per-job budget caps and circuit breakers |

One API key. All nine capabilities. Every call tracked and metered in the Sapiom dashboard.

---

## The stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth tokens | JWT via `jose` |
| Auth verification | Sapiom Verify (Prelude) |
| Orchestrator | Claude via Sapiom OpenRouter + Vercel AI SDK |
| Job queue | Inngest |
| Data storage | Upstash Redis (direct) |
| Scheduling | QStash via Sapiom Messaging |
| Spend governance | Sapiom spending rules |

---

## Running it

```bash
git clone https://github.com/ynadge/realism
cd realism
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
# The only key you need for all Sapiom services
SAPIOM_API_KEY=          # from app.sapiom.ai

# App infrastructure (not Sapiom)
UPSTASH_REDIS_URL=       # from upstash.com
UPSTASH_REDIS_TOKEN=     # from upstash.com
NEXTAUTH_SECRET=         # any random 32-char string
NEXT_PUBLIC_APP_URL=     # http://localhost:3000 for local
INNGEST_EVENT_KEY=       # from app.inngest.com
INNGEST_SIGNING_KEY=     # from app.inngest.com

# Optional connectors
SPOTIFY_CLIENT_ID=       # only needed for Spotify connector
SPOTIFY_CLIENT_SECRET=   # only needed for Spotify connector
```

Notice that one Sapiom key covers nine different services. Everything else is the app's own infrastructure.

```bash
npm run dev
```

You will also need Inngest running locally for job execution:

```bash
npx inngest-cli@latest dev
```

---

## What's running

The full pipeline works end-to-end. Three demo applications are live in production:

- **Bitcoin Market Pulse** — Terminal personality
- **Personal Formal Wear Size Finder** — Tool personality
- **Mk.gee and Similar Artists Explorer** — Editorial personality

---

## The bigger picture

The sizing tool that knows your measurements and fetches retailer guides on demand is a piece of software that someone would previously have needed to hire a developer to build. The music intelligence page curated to your specific taste, with a design that matches the aesthetic of the music, would have been a custom project. The Bitcoin terminal updating itself with live data and synthesis is something that lived only in Bloomberg terminal subscriptions.

These are now things you can have by describing what you want.

Sapiom is what makes this possible at the cost and complexity level where it can actually be built by one person in two days. The interesting problem is no longer "how do I access these services" but "what do I build with them."

Realism is one answer to that question. There are many others waiting to be built.

**[Get a Sapiom API key and start building →](https://app.sapiom.ai)**