# Cerebro Diem

> "Seize Your Thoughts"

AI-powered personal knowledge management app that eliminates the cognitive overhead of organizing thoughts. Capture via voice or text, and AI automatically classifies, routes, and surfaces information at the right time.

## Core Value Proposition

**Capture in seconds. AI organizes. Daily digests keep you on track.**

## How It Works

1. **Capture** - Voice (push-to-talk) or text, under 3 seconds
2. **AI Classifies** - Automatically routes to People, Projects, Ideas, or Tasks
3. **Review** - Low-confidence items held for quick one-tap confirmation
4. **Daily Digest** - Morning notification with your top 3 priorities

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Android first, iOS next) |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions) |
| AI | OpenAI (GPT-4o-mini for classification, Whisper for voice) |
| State | Zustand + TanStack Query |

## Project Structure

```
cerebro-diem/
├── apps/
│   └── mobile/           # React Native app
├── packages/
│   └── core/             # Shared business logic & types
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database schema
└── docs/                 # Documentation
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start mobile app (Android)
pnpm --filter mobile android

# Run Supabase locally
pnpm supabase start
```

## Documentation

- [PRD.md](./PRD.md) - Full product requirements document
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Technical architecture

## Links

- **Website**: [CerebroDiem.com](https://cerebrodiem.com)
- **Supabase Project**: `epbnucvawcggjmttwwtg`

## License

Private - All rights reserved
