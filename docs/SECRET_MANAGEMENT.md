# Secret Management

Infisical is the source of truth for all secrets in Cerebro Diem.

## Infisical Instance Details

| Property | Value |
|----------|-------|
| **API URL** | `http://100.64.0.1:8443` (Tailscale network) |
| **Project Name** | Ceerebro Diem |
| **Project ID** | `98ff09fd-777f-4779-8c47-e2c566226fe1` |
| **Project Slug** | `ceerebro-diem-4ioz` |
| **Environments** | `dev`, `staging`, `prod` |
| **Machine Identity ID** | `d191c389-8831-4f61-8d0b-b73ed2c84919` |
| **Machine Identity Client ID** | `d759fba8-f472-4415-a41c-3492c3e820bb` |

---

## Secrets

| Secret | Description | Used By | Status |
|--------|-------------|---------|--------|
| `SUPABASE_URL` | Supabase project URL | Mobile app, Edge Functions | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Mobile app | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (admin) | Edge Functions | ✅ |
| `FCM_SERVICE_ACCOUNT` | Firebase service account JSON for push notifications | Edge Functions | ✅ |
| `GOOGLE_SERVICES_JSON` | Firebase client configuration | Mobile app (Android) | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM calls | Edge Functions | ✅ |

---

## Quick Start

### Authentication

```bash
# Get access token using Universal Auth
export INFISICAL_ACCESS_TOKEN=$(curl -s -X POST "http://100.64.0.1:8443/api/v1/auth/universal-auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "d759fba8-f472-4415-a41c-3492c3e820bb",
    "clientSecret": "<CLIENT_SECRET>"
  }' | jq -r '.accessToken')
```

### List Secrets

```bash
curl -s "http://100.64.0.1:8443/api/v3/secrets/raw?workspaceId=98ff09fd-777f-4779-8c47-e2c566226fe1&environment=dev&secretPath=/" \
  -H "Authorization: Bearer $INFISICAL_ACCESS_TOKEN" | jq '.secrets[].secretKey'
```

### Get a Specific Secret

```bash
curl -s "http://100.64.0.1:8443/api/v3/secrets/raw/SUPABASE_URL?workspaceId=98ff09fd-777f-4779-8c47-e2c566226fe1&environment=dev&secretPath=/" \
  -H "Authorization: Bearer $INFISICAL_ACCESS_TOKEN" | jq -r '.secret.secretValue'
```

### Create/Update a Secret

```bash
curl -s -X POST "http://100.64.0.1:8443/api/v3/secrets/raw/NEW_SECRET_NAME" \
  -H "Authorization: Bearer $INFISICAL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "98ff09fd-777f-4779-8c47-e2c566226fe1",
    "environment": "dev",
    "secretPath": "/",
    "secretValue": "the-secret-value"
  }'
```

### Delete a Secret

**IMPORTANT:** DELETE requires a JSON body, not query parameters.

```bash
curl -s -X DELETE "http://100.64.0.1:8443/api/v3/secrets/raw/SECRET_TO_DELETE" \
  -H "Authorization: Bearer $INFISICAL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "98ff09fd-777f-4779-8c47-e2c566226fe1",
    "environment": "dev",
    "secretPath": "/"
  }'
```

---

## Using the CLI

```bash
# Install
npm install -g @infisical/cli

# List secrets
npx @infisical/cli secrets \
  --output json \
  --domain http://100.64.0.1:8443 \
  --env dev \
  --projectId 98ff09fd-777f-4779-8c47-e2c566226fe1 \
  --token "$INFISICAL_ACCESS_TOKEN" \
  --path /

# Set a secret
npx @infisical/cli secrets set MY_SECRET=value \
  --domain http://100.64.0.1:8443 \
  --env dev \
  --projectId 98ff09fd-777f-4779-8c47-e2c566226fe1 \
  --token "$INFISICAL_ACCESS_TOKEN" \
  --path /
```

---

## Supabase Edge Functions

The Edge Functions use these environment variables:
- `SUPABASE_URL` - Set automatically by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Set automatically by Supabase
- `OPENROUTER_API_KEY` - For AI classification/digest generation ✅
- `FCM_SERVICE_ACCOUNT` - For push notifications ✅

### Setting Secrets in Supabase

```bash
# Use the shared Supabase access token
export SUPABASE_ACCESS_TOKEN="sbp_e27b97ab401f37cd5dcfbca57d08ce4047f15c2e"

# Set secrets
supabase secrets set OPENROUTER_API_KEY='sk-or-...' --project-ref epbnucvawcggjmttwwtg
supabase secrets set FCM_SERVICE_ACCOUNT='{"type":"service_account",...}' --project-ref epbnucvawcggjmttwwtg

# List secrets
supabase secrets list --project-ref epbnucvawcggjmttwwtg
```

### Syncing from Infisical to Supabase

Currently manual. Future: Set up Infisical Native Sync to Supabase (requires configuring in Infisical Dashboard → Integrations → Supabase).

---

## Mobile App

The mobile app uses:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`
- `google-services.json` at `apps/mobile/android/app/google-services.json`

For local development, copy `.env.example` to `.env.local` and fill in the values from Infisical.

---

## Firebase Setup

### Service Account (Server-side)

The `FCM_SERVICE_ACCOUNT` secret contains the Firebase Admin SDK service account JSON. This is used by Edge Functions to send push notifications via FCM v1 API.

To regenerate:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Update the secret in Infisical and Supabase

### Client Configuration (Mobile App)

The `google-services.json` file is used by the Android app to connect to Firebase.

To regenerate:
1. Go to Firebase Console → Project Settings → General
2. Download `google-services.json` for the Android app
3. Place it at `apps/mobile/android/app/google-services.json`

---

## Rules

1. **Never hardcode secrets in code**
2. **Infisical is the source of truth** - update secrets there first
3. **Never commit `.env.local` or service account files**
4. **Use environment-specific secrets** when values differ between dev/staging/prod
