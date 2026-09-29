# Flow Space — clean working copy

This package is a cleaned continuation of the local Flow Space project.

## What was changed

1. Removed generated and sensitive content from the distributable copy (`node_modules`, `build`, `.env`, `.git`).
2. Hardened `.gitignore` so environment files are not committed.
3. Added `.env.example` with placeholders only.
4. AI server endpoint now uses Polza API through `POLZA_API_KEY` and verifies Firebase ID tokens with Firebase Admin.
5. Telegram alerts now go through `/api/telegram`; the bot token is no longer read by browser code.
6. Telegram web requests require Firebase authentication.
7. Added optional Telegram webhook secret validation.

## Run locally

1. Copy `.env.example` to `.env.local` and fill in your own values.
2. Run `npm install`.
3. Run `npm start`.

For Vercel, add the same server variables in Project Settings → Environment Variables.

## Important

The existing Firestore schema and UI were deliberately not migrated in this cleanup pass. A SaaS data migration should be implemented and tested separately to avoid breaking current data.
