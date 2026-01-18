# Cerebro Diem - Claude Instructions

## Project Overview

Cerebro Diem is an AI-powered personal knowledge management mobile app. Users capture thoughts via voice or text, and AI automatically classifies them into People, Projects, Ideas, or Tasks.

## Tech Stack

- **Mobile**: React Native 0.76+ (Android first, iOS later)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: OpenRouter (gpt-4o-mini for classification, Whisper for transcription)
- **Push Notifications**: Firebase Cloud Messaging (FCM v1 API)
- **Secret Management**: Infisical (self-hosted)

## Key Directories

```
apps/mobile/          # React Native mobile app
  src/
    features/         # Feature modules (capture, browse, digest, etc.)
    services/         # API, auth, notifications
    stores/           # Zustand state management
supabase/
  functions/          # Edge Functions (Deno)
  migrations/         # Database migrations
packages/core/        # Shared types and constants
docs/                 # Documentation
```

## Infisical (Secret Management)

**IMPORTANT:** This project uses the self-hosted Infisical instance, NOT Infisical Cloud.

| Property | Value |
|----------|-------|
| **API URL** | `http://100.64.0.1:8443` (Tailscale) |
| **Project ID** | `98ff09fd-777f-4779-8c47-e2c566226fe1` |
| **Machine Identity Client ID** | `d759fba8-f472-4415-a41c-3492c3e820bb` |
| **Environments** | `dev`, `staging`, `prod` |

### Quick Commands

```bash
# Authenticate
export INFISICAL_ACCESS_TOKEN=$(curl -s -X POST "http://100.64.0.1:8443/api/v1/auth/universal-auth/login" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"d759fba8-f472-4415-a41c-3492c3e820bb","clientSecret":"<SECRET>"}' | jq -r '.accessToken')

# List secrets
curl -s "http://100.64.0.1:8443/api/v3/secrets/raw?workspaceId=98ff09fd-777f-4779-8c47-e2c566226fe1&environment=dev&secretPath=/" \
  -H "Authorization: Bearer $INFISICAL_ACCESS_TOKEN" | jq '.secrets[].secretKey'
```

See `docs/SECRET_MANAGEMENT.md` for full documentation.

## Build Commands

```bash
# Install dependencies
cd apps/mobile && npm install

# Run Metro bundler
npm start

# Build Android APK
cd android && ./gradlew assembleRelease

# APK location
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Supabase Commands

```bash
# Deploy Edge Functions
supabase functions deploy --project-ref epbnucvawcggjmttwwtg

# Run migrations
supabase db push --project-ref epbnucvawcggjmttwwtg

# Set secrets
supabase secrets set KEY=value --project-ref epbnucvawcggjmttwwtg
```

## Important Notes

1. **FCM uses v1 API** - The legacy FCM API is disabled. Edge Functions use OAuth2/JWT authentication with the service account.

2. **Never commit secrets** - Use Infisical for secret management. The `.env.local` file is gitignored.

3. **Onboarding requests permissions** - The app requests microphone and notification permissions during onboarding.

4. **Classification confidence threshold** - Items with confidence < 0.6 go to the review queue.
