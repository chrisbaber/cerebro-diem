# Cerebro Diem - Product Requirements Document (PRD)

## Executive Summary

**Product Name**: Cerebro Diem
**Domain**: CerebroDiem.com
**Tagline**: "Seize Your Thoughts"

Cerebro Diem is an AI-powered personal knowledge management app that eliminates the cognitive overhead of organizing thoughts. Users capture via voice or text, and AI automatically classifies, routes, and surfaces information at the right time.

**Core Value Proposition**: Capture in seconds. AI organizes. Daily digests keep you on track.

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Target Users](#2-target-users)
3. [User Requirements Summary](#3-user-requirements-summary)
4. [MVP Scope](#4-mvp-scope)
5. [Feature Specifications](#5-feature-specifications)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Models](#7-data-models)
8. [API Specifications](#8-api-specifications)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Security & Privacy](#10-security--privacy)
11. [Release Strategy](#11-release-strategy)
12. [Success Metrics](#12-success-metrics)
13. [Future Roadmap](#13-future-roadmap)
14. [Appendices](#14-appendices)

---

## 1. Product Vision

### 1.1 Problem Statement

Traditional note-taking and productivity systems fail because they require **cognitive work at the worst possible moment**:
- Deciding where a thought belongs when you're rushing to a meeting
- Tagging and organizing when you just want to capture and move on
- Remembering to review notes that pile up unused

Result: 95% of people abandon their "second brain" systems within weeks.

### 1.2 Solution

Cerebro Diem shifts the burden from human to AI:

| Traditional Systems | Cerebro Diem |
|---------------------|--------------|
| You capture AND organize | You capture only |
| You decide categories | AI classifies automatically |
| You remember to review | System nudges you daily |
| You search for info | Relevant info surfaces to you |
| Organization is work | Organization is invisible |

### 1.3 Vision Statement

> "Make capturing a thought as easy as speaking it, and trust that your second brain will organize, remember, and remind you at exactly the right moment."

### 1.4 Design Principles

1. **Frictionless Capture**: Under 3 seconds from thought to captured
2. **Zero-Decision Input**: No categories, tags, or folders at capture time
3. **Trust Through Transparency**: Show what AI decided and make corrections trivial
4. **Proactive Surfacing**: Push relevant info to users; don't wait for searches
5. **Graceful Degradation**: Low-confidence items held for review, not auto-filed incorrectly
6. **Restart-Friendly**: Missing a week shouldn't create guilt or backlog

---

## 2. Target Users

### 2.1 Primary Persona: "The Overwhelmed Professional"

**Demographics**: 25-55, knowledge workers, managers, entrepreneurs
**Pain Points**:
- Too many thoughts, not enough system
- Tried Notion/Obsidian/Evernote, abandoned them
- Anxiety from untracked commitments
- Forgets important follow-ups with people

**Needs**:
- Capture thoughts while driving/walking (voice)
- Remember what people told them
- Track projects without project management overhead
- Daily clarity on what matters

### 2.2 Secondary Persona: "The Idea Collector"

**Demographics**: Creatives, writers, founders
**Pain Points**:
- Ideas come at random times
- Loses ideas before capturing them
- Can't find ideas when needed

**Needs**:
- Instant voice capture
- Ideas organized by theme
- Pattern recognition across ideas

---

## 3. User Requirements Summary

Based on requirements gathering:

| Requirement | Decision |
|-------------|----------|
| Primary capture method | **Voice** (push-to-talk), with text/doc paste backup |
| Import formats | Plain text, PDF, Images (OCR), URLs |
| LLM Provider | **OpenAI** (gpt-4o-mini) |
| Sync | **Cloud sync from day one** (Supabase) |
| Distribution | **Public release** (app stores) |
| Categories | **4 standard**: People, Projects, Ideas, Tasks (customizable later) |
| Digest timing | **8-9am** (user configurable) |
| First platform | **Android** |
| Timeline | **2-4 weeks** aggressive MVP |
| Auth methods | Email/password, Google, Apple |
| MVP integrations | **None** - core only, integrations in v1.1 |
| Monetization | **Decide later** - build first |

---

## 4. MVP Scope

### 4.1 MVP Definition (2-4 Weeks)

**In Scope**:
- [ ] Android app (phone optimized)
- [ ] Voice capture (push-to-talk)
- [ ] Text capture (paste/type)
- [ ] AI classification (OpenAI gpt-4o-mini)
- [ ] 4 category buckets (People, Projects, Ideas, Tasks)
- [ ] Confidence scoring + review queue
- [ ] Browse/search all entries
- [ ] Daily digest (push notification + in-app)
- [ ] Cloud sync (Supabase)
- [ ] User auth (Email, Google, Apple)
- [ ] Basic corrections (reclassify, edit)

**Out of Scope for MVP**:
- iOS app (Phase 2)
- Desktop app (Phase 3)
- Web app (Phase 3)
- PDF/Image/URL import (v1.1)
- Calendar integration (v1.1)
- Email capture (v1.1)
- Slack/Teams integration (v1.2)
- Weekly review digest (v1.1)
- Custom categories (v1.2)
- Offline mode (v1.1)
- Widgets (v1.1)

### 4.2 MVP Success Criteria

1. User can voice-capture a thought in under 5 seconds
2. AI correctly classifies >80% of captures (confidence >= 0.6)
3. Daily digest delivered reliably at configured time
4. Data syncs across app reinstalls
5. User can find any captured thought via search

---

## 5. Feature Specifications

### 5.1 Quick Capture

#### 5.1.1 Voice Capture

**User Flow**:
```
[Open App] → [Tap & Hold Mic Button] → [Speak] → [Release] → [Processing...] → [Confirmed ✓]
```

**Requirements**:
- F-CAP-01: Push-to-talk: Recording starts on press, stops on release
- F-CAP-02: Optional tap-to-start mode (toggle in settings)
- F-CAP-03: Visual feedback during recording (waveform or pulse animation)
- F-CAP-04: Transcription via OpenAI Whisper API
- F-CAP-05: Show transcribed text before confirming (editable)
- F-CAP-06: Haptic feedback on start/stop
- F-CAP-07: Works from lock screen (Android widget, future)

**Acceptance Criteria**:
- Recording latency < 200ms from press
- Transcription accuracy > 95% for clear speech
- Full flow completes in < 5 seconds for 10-word thought

#### 5.1.2 Text Capture

**User Flow**:
```
[Open App] → [Type in Input Field] → [Tap Send] → [Processing...] → [Confirmed ✓]
```

**Requirements**:
- F-CAP-10: Single text input field, always visible on home
- F-CAP-11: Multi-line support (auto-expand)
- F-CAP-12: Paste from clipboard supported
- F-CAP-13: Send on Enter (configurable, default: new line)
- F-CAP-14: Character limit: 5,000 characters per capture

#### 5.1.3 Processing Pipeline

```
[Raw Input] → [Transcribe if voice] → [Send to LLM] → [Parse Response] → [Route to DB] → [Confirm to User]
```

**Requirements**:
- F-CAP-20: All captures logged to `captures` table immediately
- F-CAP-21: LLM classification happens async (non-blocking UI)
- F-CAP-22: Classification result stored in `classifications` table
- F-CAP-23: If confidence >= 0.6, auto-route to destination table
- F-CAP-24: If confidence < 0.6, mark as `needs_review`
- F-CAP-25: Reply to user with classification result (toast/snackbar)
- F-CAP-26: Retry logic: 3 attempts with exponential backoff on LLM failure

---

### 5.2 AI Classification

#### 5.2.1 Classification Prompt

```
You are a personal knowledge classifier for Cerebro Diem. Given a raw thought, classify it into exactly one category and extract structured fields.

## Categories

1. **person**: Information about a specific person
   - Use when: The thought is primarily about a specific named individual
   - Extract: name, context (relationship/how you know them), follow_ups (things to remember)

2. **project**: A multi-step endeavor with a goal
   - Use when: Involves multiple steps, has an outcome, is ongoing work
   - Extract: name, status (active|waiting|blocked|someday), next_action (specific executable action), notes

3. **idea**: A concept, insight, or possibility
   - Use when: It's a "what if", creative thought, insight, or something to explore
   - Extract: title, one_liner (core insight in one sentence), notes

4. **task**: A single actionable item
   - Use when: One discrete action, no larger project context, an errand
   - Extract: name, due_date (if mentioned, else null), notes

## Rules

1. Choose the MOST specific category that fits
2. If a person is mentioned but the thought is really about a project, choose project
3. Extract the most SPECIFIC, ACTIONABLE next_action possible
4. Convert vague intentions to concrete actions:
   - "work on website" → "Draft homepage copy for website"
   - "talk to Mike" → "Schedule call with Mike to discuss Q2 plans"
5. If no clear due date, set due_date to null
6. Confidence should reflect how certain you are (0.0-1.0)

## Output Format

Return ONLY valid JSON, no markdown, no explanation:

{
  "category": "person" | "project" | "idea" | "task",
  "confidence": 0.0-1.0,
  "extracted": {
    // category-specific fields
  }
}

## Examples

Input: "Mike mentioned he's interested in the automation project, follow up next week"
Output: {"category": "person", "confidence": 0.85, "extracted": {"name": "Mike", "context": "interested in automation project", "follow_ups": ["Follow up next week about automation project"]}}

Input: "Website redesign - need to get copy from Sarah by Friday"
Output: {"category": "project", "confidence": 0.92, "extracted": {"name": "Website Redesign", "status": "active", "next_action": "Email Sarah to request copy by Friday", "notes": "Need copy for redesign"}}

Input: "What if we used AI to auto-generate meeting summaries?"
Output: {"category": "idea", "confidence": 0.88, "extracted": {"title": "AI Meeting Summaries", "one_liner": "Use AI to automatically generate summaries after meetings", "notes": ""}}

Input: "Buy milk"
Output: {"category": "task", "confidence": 0.95, "extracted": {"name": "Buy milk", "due_date": null, "notes": ""}}
```

#### 5.2.2 Classification Requirements

- F-CLS-01: Use OpenAI gpt-4o-mini model
- F-CLS-02: Temperature = 0 (deterministic)
- F-CLS-03: Max tokens = 500
- F-CLS-04: Timeout = 30 seconds
- F-CLS-05: Store raw LLM response for debugging
- F-CLS-06: Parse JSON strictly, reject malformed responses
- F-CLS-07: On parse failure, mark capture as `needs_review`

---

### 5.3 Review Queue

**Purpose**: Handle low-confidence classifications with minimal user effort

**User Flow**:
```
[See "3 items need review" badge] → [Open Review Queue] → [See item + AI guess] → [Tap correct category] → [Done]
```

**Requirements**:
- F-REV-01: Badge count on home screen when items need review
- F-REV-02: Review screen shows original text + AI's guess + confidence
- F-REV-03: One-tap buttons for each category (Person, Project, Idea, Task)
- F-REV-04: "AI got it right" button to confirm guess
- F-REV-05: Swipe to dismiss (keep as-is)
- F-REV-06: Edit extracted fields before confirming

---

### 5.4 Browse & Search

#### 5.4.1 Category Views

**People View**:
- F-BRW-01: List of all people, sorted by `last_touched` desc
- F-BRW-02: Each card shows: name, context snippet, follow-up count
- F-BRW-03: Tap to view full detail + edit

**Projects View**:
- F-BRW-10: Tab filters: Active, Waiting, Blocked, Someday, Done
- F-BRW-11: Each card shows: name, status badge, next action
- F-BRW-12: Visual indicator if no activity in 5+ days

**Ideas View**:
- F-BRW-20: Card grid layout
- F-BRW-21: Each card shows: title, one-liner
- F-BRW-22: Tap to expand full notes

**Tasks View**:
- F-BRW-30: Simple checklist
- F-BRW-31: Sort by due date (soonest first), then created date
- F-BRW-32: Tap checkbox to mark done
- F-BRW-33: Overdue tasks highlighted

#### 5.4.2 Search

- F-SRC-01: Global search bar on home screen
- F-SRC-02: Searches across all categories
- F-SRC-03: Full-text search on all text fields
- F-SRC-04: Results grouped by category
- F-SRC-05: Highlight matching terms

---

### 5.5 Daily Digest

#### 5.5.1 Generation

**Trigger**: Scheduled job at user-configured time (default 8:00 AM local)

**Digest Prompt**:
```
Generate a concise daily digest for a productivity app user. Keep it under 150 words.

## Available Data
- Active projects: {projects}
- People with follow-ups: {people}
- Pending tasks: {tasks}
- Recent captures: {recent}

## Output Format

**🎯 Top 3 for Today**
1. [Most important/urgent action]
2. [Second priority]
3. [Third priority]

**⚠️ Might Be Stuck**
- [Any project with no activity in 5+ days, or skip if none]

**💡 Quick Win**
- [One small encouraging note or easy task to build momentum]

Be specific. Use actual names and actions from the data. No generic advice.
```

#### 5.5.2 Delivery

- F-DIG-01: Generate digest via scheduled Supabase Edge Function
- F-DIG-02: Store generated digest in `digests` table
- F-DIG-03: Send push notification with summary (first 2 lines)
- F-DIG-04: Full digest viewable in app
- F-DIG-05: Mark as read when viewed
- F-DIG-06: Time configurable in settings (default 8:00 AM)
- F-DIG-07: Timezone-aware scheduling

---

### 5.6 Corrections

**Requirements**:
- F-COR-01: From any item detail view, "Reclassify" button
- F-COR-02: Reclassify shows category picker, moves item to new table
- F-COR-03: All fields editable inline
- F-COR-04: Changes sync immediately
- F-COR-05: Correction logged in `classifications` table (for ML improvement)

---

### 5.7 Settings

- F-SET-01: Account management (email, password, delete account)
- F-SET-02: Digest time configuration
- F-SET-03: Voice capture mode (push-to-talk vs tap-to-start)
- F-SET-04: Notification preferences
- F-SET-05: Confidence threshold adjustment (advanced, default 0.6)
- F-SET-06: Export all data (JSON)
- F-SET-07: About / Version info

---

## 6. Technical Architecture

### 6.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID APP                               │
│                      (React Native)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   UI Layer  │  │  State Mgmt │  │     Local Cache         │ │
│  │   (React)   │  │  (Zustand)  │  │  (React Query + MMKV)   │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         └────────────────┼─────────────────────┘               │
│                          │                                      │
│                  ┌───────▼───────┐                             │
│                  │  API Service  │                             │
│                  │  (Supabase    │                             │
│                  │   Client)     │                             │
│                  └───────┬───────┘                             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │    Auth     │  │  Database   │  │    Edge Functions       │ │
│  │  (GoTrue)   │  │ (PostgreSQL)│  │  - classify_capture     │ │
│  │             │  │             │  │  - generate_digest      │ │
│  │ - Email     │  │ - captures  │  │  - transcribe_audio     │ │
│  │ - Google    │  │ - people    │  │                         │ │
│  │ - Apple     │  │ - projects  │  │                         │ │
│  └─────────────┘  │ - ideas     │  └───────────┬─────────────┘ │
│                   │ - tasks     │              │               │
│                   │ - digests   │              │               │
│                   └─────────────┘              │               │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────┐
                                    │    OpenAI API     │
                                    │  - Whisper (STT)  │
                                    │  - GPT-4o-mini    │
                                    └───────────────────┘
```

### 6.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Mobile Framework | React Native 0.76+ | Cross-platform, large ecosystem |
| Language | TypeScript | Type safety, better DX |
| State Management | Zustand | Simple, performant, minimal boilerplate |
| Server State | TanStack Query (React Query) | Caching, sync, optimistic updates |
| Local Storage | MMKV | Fast key-value for preferences |
| Backend | Supabase | Auth + DB + Functions in one |
| Database | PostgreSQL (via Supabase) | Relational, robust, good for queries |
| Auth | Supabase Auth | Email, Google, Apple built-in |
| Serverless Functions | Supabase Edge Functions (Deno) | Colocated with DB, low latency |
| LLM | OpenAI API | gpt-4o-mini for classification, Whisper for STT |
| Push Notifications | Firebase Cloud Messaging | Industry standard for Android |
| Voice Recording | react-native-audio-recorder-player | Well-maintained, push-to-talk support |
| Navigation | React Navigation 7 | Standard for React Native |
| UI Components | React Native Paper | Material Design 3, accessible |

### 6.3 Project Structure

```
cerebro-diem/
├── apps/
│   └── mobile/                    # React Native app
│       ├── src/
│       │   ├── app/               # App entry, navigation
│       │   ├── components/        # Reusable UI components
│       │   ├── features/          # Feature modules
│       │   │   ├── capture/       # Voice/text capture
│       │   │   ├── browse/        # Category views
│       │   │   ├── digest/        # Daily digest
│       │   │   ├── review/        # Review queue
│       │   │   └── settings/      # Settings screens
│       │   ├── services/          # API, auth, storage
│       │   ├── stores/            # Zustand stores
│       │   ├── hooks/             # Custom hooks
│       │   ├── utils/             # Helpers
│       │   └── types/             # TypeScript types
│       ├── android/               # Android native
│       ├── ios/                   # iOS native (future)
│       └── package.json
│
├── packages/
│   └── core/                      # Shared business logic
│       ├── src/
│       │   ├── types/             # Shared types
│       │   ├── constants/         # Classification prompts, etc.
│       │   └── utils/             # Shared utilities
│       └── package.json
│
├── supabase/
│   ├── functions/                 # Edge Functions
│   │   ├── classify-capture/
│   │   ├── generate-digest/
│   │   └── transcribe-audio/
│   ├── migrations/                # DB migrations
│   └── seed.sql                   # Test data
│
├── docs/                          # Documentation
├── .github/                       # CI/CD workflows
├── package.json                   # Monorepo root
├── turbo.json                     # Turborepo config
└── README.md
```

---

## 7. Data Models

### 7.1 Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (managed by Supabase Auth, extended here)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    digest_time TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'America/New_York',
    voice_mode TEXT DEFAULT 'push_to_talk' CHECK (voice_mode IN ('push_to_talk', 'tap_to_start')),
    confidence_threshold DECIMAL(3,2) DEFAULT 0.60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw captures (the inbox)
CREATE TABLE public.captures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('voice', 'text', 'import')),
    audio_url TEXT,  -- If voice, link to audio file
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classification results (the receipt/audit trail)
CREATE TABLE public.classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capture_id UUID NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('person', 'project', 'idea', 'task')),
    confidence DECIMAL(3,2) NOT NULL,
    extracted_fields JSONB NOT NULL,
    raw_llm_response TEXT,
    destination_id UUID,  -- FK to final entity (person/project/idea/task)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'auto_filed', 'needs_review', 'manually_filed', 'manually_corrected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- People
CREATE TABLE public.people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    context TEXT,
    follow_ups TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    last_touched TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'blocked', 'someday', 'done')),
    next_action TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas
CREATE TABLE public.ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    one_liner TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digests
CREATE TABLE public.digests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_captures_user_id ON public.captures(user_id);
CREATE INDEX idx_captures_processed ON public.captures(processed);
CREATE INDEX idx_classifications_user_id ON public.classifications(user_id);
CREATE INDEX idx_classifications_status ON public.classifications(status);
CREATE INDEX idx_people_user_id ON public.people(user_id);
CREATE INDEX idx_people_last_touched ON public.people(last_touched DESC);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_digests_user_id ON public.digests(user_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own captures" ON public.captures FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own classifications" ON public.classifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own people" ON public.people FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own ideas" ON public.ideas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own digests" ON public.digests FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER people_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 7.2 TypeScript Types

```typescript
// packages/core/src/types/index.ts

export type CaptureSource = 'voice' | 'text' | 'import';

export type Category = 'person' | 'project' | 'idea' | 'task';

export type ProjectStatus = 'active' | 'waiting' | 'blocked' | 'someday' | 'done';

export type TaskStatus = 'pending' | 'in_progress' | 'done';

export type ClassificationStatus = 'pending' | 'auto_filed' | 'needs_review' | 'manually_filed' | 'manually_corrected';

export type VoiceMode = 'push_to_talk' | 'tap_to_start';

export type DigestType = 'daily' | 'weekly';

// Database row types
export interface Profile {
  id: string;
  display_name: string | null;
  digest_time: string;
  timezone: string;
  voice_mode: VoiceMode;
  confidence_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Capture {
  id: string;
  user_id: string;
  raw_text: string;
  source: CaptureSource;
  audio_url: string | null;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export interface Classification {
  id: string;
  capture_id: string;
  user_id: string;
  category: Category;
  confidence: number;
  extracted_fields: ExtractedFields;
  raw_llm_response: string | null;
  destination_id: string | null;
  status: ClassificationStatus;
  created_at: string;
}

export type ExtractedFields =
  | PersonExtracted
  | ProjectExtracted
  | IdeaExtracted
  | TaskExtracted;

export interface PersonExtracted {
  name: string;
  context: string;
  follow_ups: string[];
}

export interface ProjectExtracted {
  name: string;
  status: ProjectStatus;
  next_action: string;
  notes: string;
}

export interface IdeaExtracted {
  title: string;
  one_liner: string;
  notes: string;
}

export interface TaskExtracted {
  name: string;
  due_date: string | null;
  notes: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  context: string | null;
  follow_ups: string[];
  tags: string[];
  last_touched: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  next_action: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  one_liner: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  due_date: string | null;
  status: TaskStatus;
  notes: string | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Digest {
  id: string;
  user_id: string;
  type: DigestType;
  content: string;
  read: boolean;
  generated_at: string;
}

// API response types
export interface ClassificationResponse {
  category: Category;
  confidence: number;
  extracted: ExtractedFields;
}
```

---

## 8. API Specifications

### 8.1 Supabase Edge Functions

#### 8.1.1 classify-capture

**Endpoint**: `POST /functions/v1/classify-capture`

**Request**:
```typescript
{
  capture_id: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  classification: Classification;
  destination: Person | Project | Idea | Task | null;
  error?: string;
}
```

**Logic**:
1. Fetch capture by ID
2. Call OpenAI with classification prompt
3. Parse JSON response
4. If confidence >= threshold:
   - Create entry in destination table
   - Update classification with destination_id and status 'auto_filed'
5. If confidence < threshold:
   - Update classification with status 'needs_review'
6. Return result

#### 8.1.2 transcribe-audio

**Endpoint**: `POST /functions/v1/transcribe-audio`

**Request**:
```typescript
{
  audio_base64: string;  // Base64 encoded audio
  format: 'webm' | 'm4a' | 'wav';
}
```

**Response**:
```typescript
{
  success: boolean;
  text: string;
  error?: string;
}
```

**Logic**:
1. Decode base64 audio
2. Call OpenAI Whisper API
3. Return transcribed text

#### 8.1.3 generate-digest

**Endpoint**: `POST /functions/v1/generate-digest` (also triggered by cron)

**Request** (manual trigger):
```typescript
{
  user_id: string;
  type: 'daily' | 'weekly';
}
```

**Response**:
```typescript
{
  success: boolean;
  digest: Digest;
  error?: string;
}
```

**Logic**:
1. Fetch user's active projects, people with follow-ups, pending tasks
2. Build context for LLM
3. Call OpenAI with digest prompt
4. Store digest in database
5. Trigger push notification

### 8.2 Supabase Realtime

Subscribe to changes for instant sync:
- `captures` table (new captures)
- `classifications` table (classification results)
- `digests` table (new digests)

---

## 9. UI/UX Requirements

### 9.1 Design System

**Colors** (Material Design 3 inspired):
```
Primary: #6750A4 (Deep Purple)
Secondary: #625B71
Tertiary: #7D5260
Surface: #FFFBFE
Background: #FFFBFE
Error: #B3261E
Success: #2E7D32

Dark Mode:
Primary: #D0BCFF
Surface: #1C1B1F
Background: #1C1B1F
```

**Typography**:
- Headlines: Roboto Medium
- Body: Roboto Regular
- Monospace: Roboto Mono (for code/JSON)

**Spacing**: 4px base unit (4, 8, 12, 16, 24, 32, 48)

**Border Radius**: 12px for cards, 8px for buttons, 24px for FABs

### 9.2 Screen Specifications

#### 9.2.1 Home Screen

```
┌─────────────────────────────────────────┐
│ ☰  Cerebro Diem               🔔 ⚙️    │  <- Header
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │  <- Capture Input
│  │ What's on your mind?         🎤│   │     (always visible)
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │  <- Today's Digest Card
│  │ 📬 Today's Digest               │   │     (if available)
│  │                                 │   │
│  │ 🎯 Top 3 for today:             │   │
│  │ 1. Email Sarah about copy       │   │
│  │ 2. Call dentist                 │   │
│  │ 3. Review Q2 roadmap            │   │
│  │                                 │   │
│  │ [View Full Digest →]            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │  <- Needs Review Badge
│  │ 📥 3 items need review      →   │   │     (if any)
│  └─────────────────────────────────┘   │
│                                         │
│  Recent Activity                       │  <- Recent Captures
│  ┌─────────────────────────────────┐   │
│  │ 🧑 Mike - "Follow up about..."  │   │
│  │ 📁 Website - "Get copy from..." │   │
│  │ 💡 AI summaries - "What if..."  │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  🏠     👥      📁      💡      ✓      │  <- Bottom Nav
│ Home  People  Projects Ideas  Tasks    │
└─────────────────────────────────────────┘
```

#### 9.2.2 Voice Capture Modal

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              ╭─────────╮               │
│              │         │               │
│              │  🎤     │   <- Mic icon
│              │         │      (pulsing when recording)
│              ╰─────────╯               │
│                                         │
│        Hold to record                  │  <- Instruction text
│                                         │
│   ┌─────────────────────────────────┐  │  <- Transcription preview
│   │ "Remember to follow up with..." │  │     (appears after release)
│   └─────────────────────────────────┘  │
│                                         │
│        [Cancel]      [Capture]         │  <- Actions
│                                         │
└─────────────────────────────────────────┘
```

#### 9.2.3 People List

```
┌─────────────────────────────────────────┐
│ ←  People                         🔍 + │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🧑 Mike Chen                    │   │
│  │    Product lead at Acme         │   │
│  │    2 follow-ups · 3 days ago    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🧑 Sarah Johnson                │   │
│  │    Copywriter                   │   │
│  │    1 follow-up · 1 week ago     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🧑 David Park                   │   │
│  │    Engineering manager          │   │
│  │    No follow-ups · 2 weeks ago  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### 9.2.4 Project Detail

```
┌─────────────────────────────────────────┐
│ ←  Website Redesign              ⋮     │
├─────────────────────────────────────────┤
│                                         │
│  Status                                │
│  ┌─────────────────────────────────┐   │
│  │ [Active] [Waiting] [Blocked]    │   │
│  │ [Someday] [Done]                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Next Action                           │
│  ┌─────────────────────────────────┐   │
│  │ Email Sarah to request copy     │   │
│  │ by Friday                       │   │
│  │                            [✏️] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Notes                                 │
│  ┌─────────────────────────────────┐   │
│  │ Need copy for homepage and      │   │
│  │ about page. Sarah mentioned     │   │
│  │ she's busy this week.           │   │
│  │                            [✏️] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Related Captures                      │
│  • Jan 15: "Get copy from Sarah..."    │
│  • Jan 12: "Website needs refresh..."  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       [🗑️ Delete Project]       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 9.3 Interaction Patterns

- **Pull to refresh**: All list views
- **Swipe actions**: Swipe left to delete, swipe right to mark done (tasks)
- **Long press**: Context menu (edit, delete, reclassify)
- **Haptic feedback**: On capture, on successful action
- **Loading states**: Skeleton loaders, not spinners
- **Empty states**: Friendly illustrations + CTAs
- **Error states**: Clear message + retry action

---

## 10. Security & Privacy

### 10.1 Data Security

- **Encryption in transit**: TLS 1.3 for all API calls
- **Encryption at rest**: Supabase handles (AES-256)
- **Row Level Security**: Users can only access own data
- **API Keys**: OpenAI key stored as Supabase secret, never exposed to client
- **Auth tokens**: Short-lived JWTs, refresh token rotation

### 10.2 Privacy

- **Data sent to LLM**: Only raw capture text (no personal database context)
- **Audio files**: Transcribed then deleted (not stored long-term)
- **No tracking**: No analytics that identify users (anonymized if any)
- **Data export**: Users can export all data anytime
- **Account deletion**: Full data deletion on request (GDPR compliant)

### 10.3 Privacy Policy Requirements

- Clear disclosure that OpenAI processes capture text
- User consent at signup
- Ability to opt out (manual classification fallback - future)

---

## 11. Release Strategy

### 11.1 Development Phases

**Phase 1: Foundation (Week 1)**
- [ ] Project setup (monorepo, Supabase, CI/CD)
- [ ] Database schema + migrations
- [ ] Auth flow (signup, login, password reset)
- [ ] Basic navigation shell

**Phase 2: Core Capture (Week 2)**
- [ ] Text capture + display
- [ ] Voice recording + transcription
- [ ] Classification Edge Function
- [ ] Capture → Classify → Route flow
- [ ] Review queue for low-confidence items

**Phase 3: Browse & Digest (Week 3)**
- [ ] All category views (People, Projects, Ideas, Tasks)
- [ ] Detail views + editing
- [ ] Search functionality
- [ ] Daily digest generation
- [ ] Push notifications

**Phase 4: Polish & Launch (Week 4)**
- [ ] Bug fixes + edge cases
- [ ] Performance optimization
- [ ] Onboarding flow
- [ ] App store assets
- [ ] Internal testing
- [ ] Play Store submission

### 11.2 Testing Strategy

**Unit Tests**:
- Classification prompt parsing
- Data transformations
- Utility functions

**Integration Tests**:
- Supabase Edge Functions
- Full capture pipeline

**E2E Tests** (Detox):
- Signup → Capture → Browse flow
- Voice capture flow
- Digest viewing

**Manual Testing**:
- Various voice inputs
- Edge cases (long text, special characters)
- Offline behavior
- Low-confidence scenarios

### 11.3 Launch Checklist

- [ ] Play Store developer account
- [ ] App listing copy + screenshots
- [ ] Privacy policy on CerebroDiem.com
- [ ] Terms of service
- [ ] Support email setup
- [ ] Error monitoring (Sentry)
- [ ] Analytics (if any, anonymized)

---

## 12. Success Metrics

### 12.1 MVP Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Capture to confirmation | < 5 seconds | Timer in app |
| Voice transcription accuracy | > 95% | Manual QA |
| Classification accuracy | > 80% auto-filed | % with confidence >= 0.6 |
| Daily digest delivery | 100% reliability | Monitoring |
| Crash-free sessions | > 99% | Sentry |

### 12.2 User Engagement (Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active captures | 3+ per user | Analytics |
| Digest open rate | > 60% | Push notification CTR |
| Day 7 retention | > 40% | Cohort analysis |
| Day 30 retention | > 20% | Cohort analysis |
| Review queue completion | > 80% same day | DB query |

---

## 13. Future Roadmap

### v1.1 (Post-MVP, +2-4 weeks)
- iOS app
- Weekly review digest
- PDF/Image import with OCR
- URL import (extract key content)
- Offline mode with sync
- Home screen widget

### v1.2 (+4-6 weeks)
- Desktop app (Electron)
- Web app
- Calendar integration (Google, Outlook)
- Custom categories
- Tags and filtering

### v1.3 (+8-12 weeks)
- Email capture (forwarding address)
- Slack/Teams integration
- Semantic search
- Pattern recognition ("You've mentioned X 5 times this month")
- Recurring task detection

### v2.0 (Future)
- Team/shared spaces
- AI insights and recommendations
- Integrations marketplace
- Local LLM option
- API for third-party apps

---

## 14. Appendices

### 14.1 Classification Prompt (Full)

See Section 5.2.1

### 14.2 Digest Prompt (Full)

See Section 5.5.1

### 14.3 Glossary

| Term | Definition |
|------|------------|
| Capture | Raw user input before classification |
| Classification | AI's determination of category + extracted fields |
| Confidence | AI's certainty in classification (0.0-1.0) |
| Destination | The table where a capture is ultimately stored |
| Digest | AI-generated summary of priorities |
| Review Queue | Holds low-confidence items for manual classification |

### 14.4 References

- Original video: "How to Build a Second Brain with AI in 2026"
- Supabase docs: https://supabase.com/docs
- React Native docs: https://reactnative.dev
- OpenAI API docs: https://platform.openai.com/docs
- Material Design 3: https://m3.material.io

---

*Document Version: 1.0*
*Created: January 2026*
*Author: Claude (for Christopher)*

---

## Implementation Plan Summary

For the 2-4 week aggressive MVP:

**Week 1**: Foundation
- Monorepo setup with Turborepo
- Supabase project + database schema
- React Native project with navigation
- Auth screens (signup, login)

**Week 2**: Core Features
- Capture input (text + voice)
- Transcription Edge Function (Whisper)
- Classification Edge Function (GPT-4o-mini)
- Processing pipeline
- Review queue

**Week 3**: Browse & Digest
- Category list views
- Detail/edit screens
- Search
- Daily digest generation
- Push notifications

**Week 4**: Polish & Ship
- Bug fixes
- Onboarding
- Play Store submission

**Critical Files to Create**:
1. `/supabase/migrations/001_initial_schema.sql`
2. `/supabase/functions/classify-capture/index.ts`
3. `/supabase/functions/transcribe-audio/index.ts`
4. `/supabase/functions/generate-digest/index.ts`
5. `/apps/mobile/src/features/capture/CaptureInput.tsx`
6. `/apps/mobile/src/features/capture/VoiceCapture.tsx`
7. `/apps/mobile/src/features/review/ReviewQueue.tsx`
8. `/apps/mobile/src/features/browse/PeopleList.tsx`
9. `/apps/mobile/src/features/digest/DigestView.tsx`
10. `/packages/core/src/constants/prompts.ts`

**Verification**:
1. Create account → lands on home screen
2. Type thought → see confirmation toast → appears in correct category
3. Voice capture → transcription shows → processes correctly
4. Low confidence item → appears in review queue → can reclassify
5. Wait for digest time → push notification arrives → view in app
6. Search → finds items across categories
