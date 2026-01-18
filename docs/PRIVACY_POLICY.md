# Privacy Policy

**Effective Date:** January 18, 2026

**Last Updated:** January 18, 2026

Cerebro Diem ("we", "us", or "our") operates the Cerebro Diem mobile application (the "App"). This Privacy Policy explains how we collect, use, and protect your information when you use our App.

## 1. Information We Collect

### 1.1 Information You Provide

- **Account Information:** Email address and password when you create an account
- **Profile Information:** Display name, timezone, and notification preferences
- **Content:** Text and voice captures, projects, ideas, tasks, and people you track

### 1.2 Information Collected Automatically

- **Device Information:** Device type, operating system version
- **Usage Data:** App interactions, feature usage patterns
- **Push Notification Tokens:** To deliver notifications to your device

### 1.3 Voice Recordings

When you use voice capture, your audio is:
- Temporarily recorded on your device
- Sent to OpenAI's Whisper API for transcription
- **Deleted immediately** after transcription (audio is not stored)

## 2. How We Use Your Information

We use your information to:

- Provide and maintain the App
- Process your captures and organize them using AI
- Generate personalized daily digests
- Send push notifications at your configured times
- Improve our services

## 3. AI Processing

### 3.1 Text Classification

Your text captures are sent to OpenAI (via OpenRouter) for AI classification. This helps us automatically categorize your thoughts into People, Projects, Ideas, or Tasks.

**What OpenAI receives:**
- The raw text of your capture
- No personal identifiers or account information

**OpenAI's data handling:**
- OpenAI does not use data sent via API for training their models
- Data is processed according to OpenAI's privacy policy: https://openai.com/privacy

### 3.2 Digest Generation

Your projects, tasks, and recent captures are summarized by AI to create your daily digest. This processing happens on our servers using OpenAI's API.

## 4. Data Storage and Security

### 4.1 Where Your Data is Stored

- Your data is stored in Supabase (PostgreSQL database)
- Supabase uses AWS infrastructure in the United States
- Data is encrypted at rest using AES-256

### 4.2 Security Measures

- All data transmission uses TLS 1.3 encryption
- Row-level security ensures you can only access your own data
- Authentication tokens are short-lived with automatic refresh

## 5. Data Sharing

We do **not** sell your data. We share data only with:

- **OpenAI (via OpenRouter):** For AI text processing (classification and digest generation)
- **Firebase Cloud Messaging:** For push notification delivery
- **Service Providers:** Who help us operate the App (Supabase for database hosting)

## 6. Your Rights

You have the right to:

- **Access:** View all your data in the App
- **Export:** Download your data as JSON (Settings → Export All Data)
- **Delete:** Delete your account and all associated data (Settings → Delete Account)
- **Correct:** Edit any of your captures, projects, ideas, tasks, or people

## 7. Data Retention

- Your data is retained as long as your account is active
- When you delete your account, all your data is permanently deleted
- Voice recordings are deleted immediately after transcription

## 8. Children's Privacy

The App is not intended for users under 13 years of age. We do not knowingly collect data from children under 13.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy in the App
- Updating the "Last Updated" date

## 10. Contact Us

If you have questions about this Privacy Policy, please contact us at:

- **Email:** privacy@cerebrodiem.com
- **Website:** https://cerebrodiem.com

---

## Summary

| What We Collect | How We Use It | Who Sees It |
|-----------------|---------------|-------------|
| Your captures (text/voice) | Organize with AI, generate digests | OpenAI (for processing only) |
| Account info (email) | Authentication | Only us |
| Device tokens | Push notifications | Firebase |
| Usage patterns | Improve the app | Only us |

**Key Points:**
- We don't sell your data
- Voice recordings are deleted after transcription
- You can export or delete your data anytime
- AI processing is done via OpenAI's API (they don't train on your data)
