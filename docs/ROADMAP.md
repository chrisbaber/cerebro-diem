# Cerebro Diem Roadmap

## MVP Status: Ready for Testing

The MVP is functionally complete. All core features are implemented and deployed.

### What's Done

| Feature | Status | Notes |
|---------|--------|-------|
| Android App | ✅ | APK at `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Voice Capture | ✅ | Push-to-talk with Whisper transcription |
| Text Capture | ✅ | Multi-line input |
| AI Classification | ✅ | OpenRouter/GPT-4o-mini via Edge Functions |
| 4 Category Buckets | ✅ | People, Projects, Ideas, Tasks |
| Confidence Scoring | ✅ | Configurable threshold (default 0.6) |
| Review Queue | ✅ | Low-confidence items held for review |
| Browse All Categories | ✅ | List views + detail screens |
| Search | ✅ | Global search |
| Daily Digest Generation | ✅ | Edge Function with LLM generation |
| Scheduled Digest Cron | ✅ | pg_cron runs every hour at :00 |
| Push Notifications | ✅ | FCM v1 API |
| Cloud Sync | ✅ | Supabase |
| Email/Password Auth | ✅ | Supabase Auth |
| Settings Screen | ✅ | Voice mode, digest time, threshold |
| Onboarding Flow | ✅ | Complete |
| Secrets Management | ✅ | Infisical + Supabase |
| Privacy Policy | ✅ | `docs/PRIVACY_POLICY.md` |

---

## Platform Status

| Platform | Status | Location |
|----------|--------|----------|
| **Android** | ✅ Ready | `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (54MB) |
| **iOS** | ❌ Not built | No iOS folder - needs `npx react-native init` |
| **Web** | 🔨 Source ready | `apps/web/` - Vite + React + Tailwind, not built |
| **Desktop (Windows/Mac/Linux)** | 🔨 Source ready | `apps/desktop/` - Electron, not built |

---

## Remaining Before Public Release

### Already Done ✅

| Task | Status |
|------|--------|
| pg_cron extension enabled | ✅ |
| Digest cron job scheduled | ✅ (`0 * * * *` - every hour) |
| Supabase secrets configured | ✅ (OPENROUTER_API_KEY, FCM_SERVICE_ACCOUNT) |

### Needs Manual Setup

| Task | Effort | Notes |
|------|--------|-------|
| **Google Sign-In** | 1-2 hrs | Requires Google Cloud Console OAuth setup |
| **Apple Sign-In** | 1-2 hrs | Requires Apple Developer account ($99/year) |
| Privacy policy web page | 30 min | Host at cerebrodiem.com/privacy |
| Real device testing | 1 hr | Install APK, test full flow |

### For App Store Release

| Task | Effort | Notes |
|------|--------|-------|
| Play Store developer account | - | $25 one-time fee |
| App listing assets | 2 hrs | Screenshots, feature graphic, description |
| Play Store submission | 1 hr | Upload APK, fill metadata |

---

## Google OAuth Setup (Manual)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select/create project "cerebro-diem"
3. APIs & Services → Credentials → Create Credentials → OAuth Client ID
4. Application type: **Web application**
5. Authorized redirect URIs: `https://epbnucvawcggjmttwwtg.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret
7. Run:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_e27b97ab401f37cd5dcfbca57d08ce4047f15c2e"
curl -X PATCH "https://api.supabase.com/v1/projects/epbnucvawcggjmttwwtg/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_google_enabled": true,
    "external_google_client_id": "YOUR_CLIENT_ID",
    "external_google_secret": "YOUR_CLIENT_SECRET"
  }'
```

## Apple OAuth Setup (Manual)

1. [Apple Developer Account](https://developer.apple.com/) required ($99/year)
2. Certificates, Identifiers & Profiles → Identifiers → Services IDs
3. Create a new Service ID with "Sign in with Apple" enabled
4. Configure domains: `epbnucvawcggjmttwwtg.supabase.co`
5. Return URL: `https://epbnucvawcggjmttwwtg.supabase.co/auth/v1/callback`
6. Generate a private key
7. Configure in Supabase via API or Dashboard

---

## Building Other Platforms

### Web App
```bash
cd apps/web
npm install
npm run build
# Output in dist/
```

### Desktop App (Windows/Mac/Linux)
```bash
cd apps/desktop
npm install
npm run build:win   # Windows .exe
npm run build:mac   # macOS .dmg
npm run build:linux # Linux AppImage
# Output in release/
```

### iOS App (Future)
```bash
cd apps/mobile
npx react-native init ios  # Generate iOS folder
cd ios && pod install
# Then build via Xcode
```

---

## Quick Commands

### Deploy Edge Functions
```bash
export SUPABASE_ACCESS_TOKEN="sbp_e27b97ab401f37cd5dcfbca57d08ce4047f15c2e"
supabase functions deploy --project-ref epbnucvawcggjmttwwtg
```

### Build Android APK
```bash
cd apps/mobile/android
./gradlew assembleRelease
# APK at app/build/outputs/apk/release/app-release.apk
```

### Check Cron Jobs
```bash
export SUPABASE_ACCESS_TOKEN="sbp_e27b97ab401f37cd5dcfbca57d08ce4047f15c2e"
curl -s -X POST "https://api.supabase.com/v1/projects/epbnucvawcggjmttwwtg/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM cron.job;"}'
```

---

## Testing Checklist

- [ ] Create account with email/password
- [ ] Capture text thought → verify classification
- [ ] Voice capture → verify transcription and classification
- [ ] Check review queue for low-confidence items
- [ ] Browse People, Projects, Ideas, Tasks
- [ ] Edit an item
- [ ] Trigger manual digest (Edge Function)
- [ ] Verify push notification received
- [ ] Check settings (digest time, voice mode)
- [ ] Sign out and back in
