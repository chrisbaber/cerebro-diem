#!/bin/bash
# Setup Supabase Edge Function Secrets
# Run this script after logging in with: supabase login

set -e

PROJECT_REF="epbnucvawcggjmttwwtg"

echo "Setting up Supabase Edge Function secrets..."
echo ""

# Check if logged in
if ! supabase projects list >/dev/null 2>&1; then
  echo "Please log in first:"
  echo "  supabase login"
  exit 1
fi

# Get OPENROUTER_API_KEY from user or environment
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "Enter your OpenRouter API key (get one at https://openrouter.ai/keys):"
  read -s OPENROUTER_API_KEY
  echo ""
fi

# Get FCM_SERVICE_ACCOUNT from Infisical
echo "Fetching FCM_SERVICE_ACCOUNT from Infisical..."
INFISICAL_TOKEN=$(curl -s -X POST "http://100.64.0.1:8443/api/v1/auth/universal-auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "d759fba8-f472-4415-a41c-3492c3e820bb",
    "clientSecret": "24e4cf909e72f7965d4c3552a1a693e14d716ffdd9d29edbbd05ea35204dd213"
  }' | jq -r '.accessToken')

FCM_SERVICE_ACCOUNT=$(curl -s "http://100.64.0.1:8443/api/v3/secrets/raw/FCM_SERVICE_ACCOUNT?workspaceId=98ff09fd-777f-4779-8c47-e2c566226fe1&environment=prod&secretPath=/" \
  -H "Authorization: Bearer $INFISICAL_TOKEN" | jq -r '.secret.secretValue' | tr -d '\n')

if [ -z "$FCM_SERVICE_ACCOUNT" ] || [ "$FCM_SERVICE_ACCOUNT" = "null" ]; then
  echo "Failed to fetch FCM_SERVICE_ACCOUNT from Infisical"
  exit 1
fi

echo "Got FCM_SERVICE_ACCOUNT from Infisical"

# Create temp env file
TMPFILE=$(mktemp)
echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY" > "$TMPFILE"
echo "FCM_SERVICE_ACCOUNT=$FCM_SERVICE_ACCOUNT" >> "$TMPFILE"

# Set secrets
echo ""
echo "Setting secrets in Supabase..."
supabase secrets set --env-file "$TMPFILE" --project-ref "$PROJECT_REF"

# Cleanup
rm -f "$TMPFILE"

echo ""
echo "✅ Secrets set successfully!"
echo ""
echo "Secrets configured:"
echo "  - OPENROUTER_API_KEY"
echo "  - FCM_SERVICE_ACCOUNT"
