# Realism

> "If you can think it, you can make it real."

Realism is a goal-execution interface built on top of [Sapiom](https://sapiom.ai). You describe what you want to exist, and Realism assembles the infrastructure, runs it within a budget you set, and hands you back something real. Not a chat window, or a workflow builder, or a template system. More like a control room.

---

[![Watch the demo](https://cdn.loom.com/sessions/thumbnails/bb6c51d1d8cc4e7db500ac6a51728aca-f67f28baefead44f.gif)](https://www.loom.com/share/bb6c51d1d8cc4e7db500ac6a51728aca)

---

## What it actually does

Most AI tools produce text. Realism produces things.

You type a goal. Realism classifies it, creates a Sapiom spending rule to govern the budget, dispatches an agentic job, and streams every tool call back to you in real time with a cost next to each one. When it finishes, you get a receipt showing exactly what was spent and what was made.

**Three modes:**

**Once** runs a goal one time and produces an artifact. A research briefing with an audio summary. A generated image and pitch. A structured analysis. Whatever the goal needs. When it finishes, you own the output.

**Scheduled** runs a goal on a cadence you choose. A weekly monitor watching Sapiom's docs for new capabilities. A daily brief on a topic you care about. The job runs in the background, stores its results, and the dashboard shows the latest output whenever you check in.

**Live** generates a real, running personal application. Not a template filled in with your content. A genuinely custom app with a custom UI, live data sources, and personal context baked in. It gets a URL you can bookmark. Every time you visit, it fetches fresh data. It lives as long as you want it to.

---

## Live mode

Type something like: *"I want a feed of everything important happening with Bitcoin right now, price context, key narratives, what smart people are saying."*

Realism spends about 60 seconds doing three things. First it plans what data sources the app needs and how often they should refresh. Then it verifies those sources actually return useful data. Then it generates a complete HTML application, a real document with its own design, its own layout, and its own refresh logic, designed specifically for that goal.

The result is a Bloomberg terminal aesthetic. Black background, electric green data, dense panels, JetBrains Mono throughout. Because that is the right design for a financial intelligence feed, and Realism knows that.

Type something different: *"My measurements are chest 38, waist 32, inseam 30. I never know what size to buy for formal wear."*

The result is a utility tool. Clean, functional, two-panel layout. Your measurements are stored as personal context and get interpolated into every data query. It fetches size guides from specific retailers on demand and gives you direct answers, not generic advice.

Type: *"I'm into Mk.gee, Men I Trust, and Arca. Make me a page about them and help me find similar artists."*

The result is an editorial magazine layout. Warm off-white background, display serif typography, image-forward. It looks like it belongs next to Pitchfork, not like something a web app generated.

Three different goals produce three genuinely different products. The design personality is classified from the goal, a full design brief is injected into the generation prompt, and Claude produces HTML that matches the brief. It works.

Generated apps run inside sandboxed iframes. They cannot touch your session, your environment variables, or any other user's data. They call a controlled data API that runs Sapiom's search, fetch, and synthesis services on their behalf. The generated code is purely presentational.

---

## The connector system

Live apps can pull from external services through a connector interface. Adding a connector is one TypeScript file implementing a simple interface, plus one line in the registry. The whole thing takes an afternoon.

Three connectors ship in v1:

- **Reddit** (no auth): subreddit feeds, search, hot posts
- **Spotify** (OAuth2): top tracks, recently played, artist info, related artists
- **RSS** (no auth): any RSS or Atom feed from any publisher

The connector interface is the open source surface of this project. If you want to add Twitch, GitHub, Letterboxd, a weather API, your Notion database, anything with an API, the path is clear. Fork the repo, add a file to `/connectors/`, register it in `index.ts`, submit a PR. No separate package to publish. No npm registry. One file.

This is the same flywheel that made Zapier's integration library valuable. Except here the community owns the connectors.

---

## What Sapiom made possible

I really have to mention this because the economics are so surprising.

Realism uses Sapiom's capability stack for everything that makes the product work: web search via Linkup, deep search via You.com, page extraction, image generation via FLUX, audio via ElevenLabs TTS, Claude via OpenRouter, phone OTP verification via Prelude, job scheduling via QStash, and spend governance via spending rules. Every capability, one API key, one account, one place to see what was spent.

The alternative would have been seven vendor accounts, seven billing cycles, seven sets of credentials to manage, and seven dashboards to check when something broke. That friction is where projects like this die during building. You spend more time managing integrations than building the product.

The full build, including all the testing, all the iterations, all the failed approaches that got thrown out and replaced, a mid-project reset that rewrote the orchestrator, the queue system, and the Redis layer, all of it cost under $30 in Sapiom credits.

That is not a rounding error. That is a structural difference in how AI capability is priced when it flows through a unified layer rather than seven separate vendors.

The x402 micropayment pattern means you pay for the calls you make, not a subscription tier you hope to justify. During intensive iteration where you make dozens of calls debugging the same function, you pay for those calls and nothing else. No monthly minimums, no "you've used 60% of your Pro tier" anxiety before a feature is even working.

Sapiom's spending rules also acted as a circuit breaker during development. Even as best-effort governance, having per-job budget caps meant a runaway orchestrator loop could not drain the account. That peace of mind has real dollar value.

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

Sapiom handles the capabilities. Standard best-in-class tools handle the plumbing. Inngest replaced a custom step function that was fighting Vercel's 60-second timeout. Direct Upstash replaced Sapiom's HTTP Redis because the native protocol is faster for the hot path. The architecture went through a hard reset partway through the build and came out cleaner for it.

---

## Design

Refined brutalism. Dark, dense, precise. Like a Bloomberg terminal designed by someone who grew up on Figma.

**Palette:**
```
Background  #0A0A0A
Surface     #111111
Border      #1E1E1E
Accent      #E8FF47   (electric lime, used sparingly)
Text        #F5F5F5
Muted       #888888
```

The accent color is called "the real color." It appears on CTAs, live indicators, and the spend meter. Everything else is near-black and near-white. The restraint makes the lime land when it shows up.

Copy voice: imperative, not inviting. "Make it real." not "Let's get started." Precise costs, not vague completion messages. The UI should feel like a control room, not a chat window.

---

## Running it

```bash
git clone https://github.com/your-username/realism
cd realism
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
SAPIOM_API_KEY=          # from app.sapiom.ai
UPSTASH_REDIS_URL=       # from upstash.com
UPSTASH_REDIS_TOKEN=     # from upstash.com
NEXTAUTH_SECRET=         # any random 32-char string
NEXT_PUBLIC_APP_URL=     # http://localhost:3000 for local
INNGEST_EVENT_KEY=       # from app.inngest.com
INNGEST_SIGNING_KEY=     # from app.inngest.com
SPOTIFY_CLIENT_ID=       # optional, only needed for Spotify connector
SPOTIFY_CLIENT_SECRET=   # optional, only needed for Spotify connector
```

```bash
npm run dev
```

You will also need Inngest running locally for job execution:

```bash
npx inngest-cli@latest dev
```

---

## Adding a connector

Every connector is a single file in `/connectors/`. Here is the shape:

```typescript
import type { Connector } from './types'

export const myConnector: Connector = {
  id: 'my-service',
  name: 'My Service',
  description: 'What this connector provides — read by the creation orchestrator',
  icon: '🔌',
  authType: 'none', // or 'oauth2' or 'api_key'

  methods: [
    {
      id: 'get_items',
      description: 'Fetches recent items from My Service',
      params: {
        query: { type: 'string', description: 'Search query', required: false },
      },
      fetch: async (credentials, params) => {
        const response = await fetch(`https://api.myservice.com/items?q=${params.query}`)
        const data = await response.json()
        return data.items.map(item => ({
          title: item.name,
          summary: item.description,
          url: item.link,
        }))
      },
    },
  ],
}
```

Register it in `connectors/index.ts`:

```typescript
import { myConnector } from './my-service'

export const connectorRegistry: Connector[] = [
  redditConnector,
  spotifyConnector,
  rssConnector,
  myConnector, // add here
]
```

That's it. The creation orchestrator will start suggesting it for relevant goals. The data executor will run it. The settings page will show its connection status.

---

## Project status

The full pipeline works end-to-end. Three demo applications are running in production:

- Bitcoin Market Pulse (Terminal personality)
- Personal Formal Wear Size Finder (Tool personality)
- Mk.gee and Similar Artists Explorer (Editorial personality)

Pre-launch work remaining: Upstash client consolidation, Spotify OAuth state parameter signing, push notifications and PWA, CONTRIBUTING.md.

---

## The bigger picture

The sizing tool that knows your measurements and fetches retailer guides on demand is a piece of software that someone would previously have needed to hire a developer to build. The music intelligence page curated to your specific taste, with a design that matches the aesthetic of the music, would have been a custom project. The Bitcoin terminal updating itself with live data and synthesis is something that lived only in Bloomberg terminal subscriptions.

These are now things you can have by describing what you want.

Sapiom is what makes this possible at the cost and complexity level where it can actually be built by one person in a few weeks. The capability layer has been commoditized enough that the interesting problem is no longer "how do I access these services" but "what do I build with them."

Realism is one answer to that question. There are many others waiting to be built.
