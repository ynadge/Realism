import type { DesignPersonality, DesignPersonalityId } from '@/types/live'

export const DESIGN_PERSONALITIES: Record<DesignPersonalityId, DesignPersonality> = {
  'financial-data': {
    id: 'financial-data',
    name: 'Terminal',
    colorScheme: 'Pure black (#000) background, electric green (#00FF41) for data values and live indicators, white (#FFFFFF) for labels and headings, dark gray (#1a1a1a) for panel backgrounds. No other colors.',
    typography: 'JetBrains Mono or Courier New for everything — monospace throughout. No sans-serif fonts. Numbers should feel like they are being printed in real time.',
    layoutStyle: 'Dense information grid. Multiple panels. Data-forward — numbers are the heroes, labels are secondary. Bloomberg terminal aesthetic. Every pixel of space used.',
    motionStyle: 'Numbers count up from zero on load. Blinking cursor on active elements. No decorative animation — only functional state changes.',
    designDirective: `Design this like a Bloomberg terminal built for someone who takes their data seriously. Dense, precise, zero decoration. The data IS the UI.

Key principles:
- Black background, green numbers, white labels — nothing else
- Monospace font for everything, always
- Multiple information panels, tightly packed
- Numbers count up on load (use a simple counter animation)
- Show a blinking green cursor somewhere to signal "live"
- Timestamps in the corner, always visible
- No rounded corners. No shadows. No gradients.
- If there are URLs, show them in dim green, underlined on hover

The user should feel like they are looking at a trading floor screen.`,
  },

  'music-culture': {
    id: 'music-culture',
    name: 'Editorial',
    colorScheme: 'Either deep charcoal (#1C1C1E) or warm off-white (#F5F0E8) as base. Single bold accent color pulled from the music genre — use a striking color like electric blue, hot pink, or acid yellow. Black for primary text on light, white on dark.',
    typography: 'A high-contrast pairing: a dramatic display serif (Playfair Display, Fraunces, or similar) for artist names and headlines — paired with a tight, modern grotesque (DM Sans, Instrument Sans) for metadata and body. Load from Google Fonts.',
    layoutStyle: 'Asymmetric magazine grid. Image-forward — artist photos and album art are heroes. Generous whitespace. Overlapping elements where tasteful. Think Pitchfork or The FADER redesigned by someone who codes.',
    motionStyle: 'Images and cards fade in with staggered delays (100ms apart). On hover: artist cards lift slightly with a subtle shadow. Metadata reveals on hover. No bouncing or elastic easing — smooth ease-out only.',
    designDirective: `Design this like a music magazine that was redesigned by a creative director who also codes. It should feel like it belongs next to Pitchfork or The FADER, not a generic web app.

Key principles:
- Large, bold artist names in a display serif — make them feel significant
- Album art and artist images take center stage
- Asymmetric layout — not a boring grid
- One striking accent color that feels right for the genre
- Metadata (plays, followers, genre) in small caps or tight uppercase
- Pull quotes or key facts displayed large
- Links styled as editorial callouts, not generic buttons
- The layout should feel intentional and curated, not generated

The user should feel like they are reading a beautifully designed music publication.`,
  },

  'personal-utility': {
    id: 'personal-utility',
    name: 'Tool',
    colorScheme: 'Dark surface (#0F0F0F) with slightly lighter panels (#1A1A1A). Accent color only on interactive elements and results — use a single purposeful color (electric blue #3B82F6 or lime #84CC16). Everything else is white or gray.',
    typography: 'Clean, highly legible sans-serif — Inter, DM Sans, or similar. Generous font sizes for primary content (the user came here to read results). Tight line-height for metadata.',
    layoutStyle: 'Functional two-panel or top/bottom split: context/input on one side, results on the other. Clear visual hierarchy. Nothing decorative. Every element has a job.',
    motionStyle: 'Instant feedback on interactions. Results appear without animation — speed signals efficiency. Only loading states animate (simple spinner or pulsing bar). No decorative motion.',
    designDirective: `Design this like a well-made professional tool. Every pixel serves a function. Nothing decorative. The user comes here to get an answer and leave.

Key principles:
- Show the user's personal context prominently (their measurements, preferences, saved data)
- Results are the hero — make them scannable and actionable
- Clear labeling — the user should never wonder what they are looking at
- Interactive elements are obvious (buttons look like buttons, inputs look like inputs)
- If there are comparisons or recommendations, use a clear visual format (table, side-by-side, ranked list)
- No unnecessary whitespace — this is a tool, not a portfolio
- A subtle "last updated" timestamp somewhere

The user should feel immediate confidence that the tool knows what it is doing.`,
  },

  'news-intelligence': {
    id: 'news-intelligence',
    name: 'Brief',
    colorScheme: 'Near-white (#FAFAFA) background with black (#0A0A0A) text for maximum readability. Single accent for urgency or importance signals — red (#DC2626) for breaking/important, or a muted blue (#3B82F6) for categories. No gradients.',
    typography: 'Strong typographic hierarchy: a high-contrast serif (Georgia, Lora, or similar) for headlines, clean sans-serif for body and metadata. Newspaper-influenced. Size contrast is extreme — headlines are large, metadata is small.',
    layoutStyle: 'Vertical column layout, importance-ranked from top. Most important item is visually dominant (larger, bolder). Below the fold items are more compact. Clear separation between items. Print-editorial sensibility.',
    motionStyle: 'Items appear top-to-bottom with 80ms stagger delays — like a page loading line by line, or a printer printing. No bounce. Clean fade-in only.',
    designDirective: `Design this like an intelligence brief prepared by a senior analyst for a busy executive. Clear hierarchy, no noise, every item ranked by importance.

Key principles:
- The most important item is visually dominant — larger headline, more space
- Items ranked from most to least important, top to bottom
- Each item: headline, 1-2 sentence summary, source + timestamp
- Importance signals: use a subtle label ("BREAKING", "KEY DEVELOPMENT") sparingly
- Strong typographic contrast — headlines are large serifs, metadata is small sans-serif
- A clear dateline at the top: "BRIEF — [date] [time]"
- No images (this is a brief, not a magazine)
- Dense but legible — this is meant to be read quickly

The user should feel like they are reading something prepared specifically for them by a knowledgeable analyst.`,
  },

  'default': {
    id: 'default',
    name: 'Clean',
    colorScheme: 'Dark background (#0A0A0A), white text, single accent color chosen to match the content theme. Clean and professional.',
    typography: 'Clear sans-serif throughout. Strong heading/body contrast. Readable at any size.',
    layoutStyle: 'Well-structured single-column or simple grid. Clear sections. Nothing fancy but nothing ugly.',
    motionStyle: 'Subtle fade-in on load. Minimal animation.',
    designDirective: `Design this as a clean, professional personal app. Clear hierarchy, readable content, well-organized sections. It should feel thoughtfully made without trying too hard to impress.

Key principles:
- Clear visual hierarchy — headings, content, metadata are visually distinct
- Readable at a glance — the user should understand what they are seeing immediately
- Well-organized sections with clear labels
- A refresh button that is easy to find
- Loading and error states that are informative, not generic

The user should feel that this was built specifically for their need.`,
  },
}

// ─── Classifier ────────────────────────────────────────────────────────────────

const PERSONALITY_SIGNALS: Array<{
  id: DesignPersonalityId
  keywords: string[]
}> = [
  {
    id: 'financial-data',
    keywords: [
      'bitcoin', 'crypto', 'price', 'stock', 'market', 'trading', 'portfolio',
      'ethereum', 'forex', 'investment', 'financial', 'fund', 'etf', 'dex',
      'defi', 'nft', 'coin', 'ticker', 'chart', 'candle', 'bull', 'bear',
    ],
  },
  {
    id: 'music-culture',
    keywords: [
      'music', 'artist', 'band', 'album', 'song', 'track', 'playlist',
      'spotify', 'listen', 'genre', 'concert', 'tour', 'release', 'rapper',
      'singer', 'producer', 'label', 'vinyl', 'merch', 'festival',
      "i'm into", 'fan of', 'listening to', 'similar artists',
    ],
  },
  {
    id: 'personal-utility',
    keywords: [
      'size', 'measurement', 'recommend', 'fit', 'calculator', 'compare',
      'convert', 'tool', 'help me', 'find me', 'suggest', 'which',
      'best', 'difference', 'versus', 'vs', 'match', 'personaliz',
    ],
  },
  {
    id: 'news-intelligence',
    keywords: [
      'news', 'brief', 'monitor', 'track', 'follow', 'update', 'daily',
      'weekly', 'feed', 'digest', 'summary', 'report', 'latest', 'breaking',
      'development', 'happening', 'intelligence', 'watch',
    ],
  },
]

export function classifyDesignPersonality(goal: string): DesignPersonalityId {
  const lower = goal.toLowerCase()

  for (const { id, keywords } of PERSONALITY_SIGNALS) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return id
    }
  }

  return 'default'
}

export function getPersonality(id: DesignPersonalityId): DesignPersonality {
  return DESIGN_PERSONALITIES[id] ?? DESIGN_PERSONALITIES['default']
}

export function buildDesignBrief(id: DesignPersonalityId): string {
  const p = getPersonality(id)
  return `DESIGN DIRECTIVE:
${p.designDirective}

COLOR SCHEME: ${p.colorScheme}
TYPOGRAPHY: ${p.typography}
LAYOUT: ${p.layoutStyle}
MOTION: ${p.motionStyle}`
}
