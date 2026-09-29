# Flow Space — security notes

This clean copy intentionally excludes:
- `.env`
- `node_modules/`
- `build/`
- `.git/`
- macOS metadata files

`.git/` is excluded because old Git history can retain credentials that were previously committed.

## Required server environment variables

- `POLZA_API_KEY`
- `AI_MODEL` (optional; use a Polza-supported model identifier)
- `TELEGRAM_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (recommended if Telegram webhook is enabled)
- `FIREBASE_SERVICE_ACCOUNT` (JSON service-account credentials, stored only in server environment)

Never prefix server secrets with `REACT_APP_` because Create React App exposes such values to the browser bundle.

## Credentials

Any credential that has ever been committed to a public repository or shared in an archive should be rotated/revoked before production use.

## Current architecture caveat

This package keeps the current Firestore data model so the local application remains compatible. The migration to dedicated `companies/{companyId}` and `users/{uid}/personalTasks` collections should be done as a separate, tested migration rather than silently changing production data paths.
