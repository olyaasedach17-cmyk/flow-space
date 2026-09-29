# Milestone 9 — Integrations foundation

Добавлен безопасный слой интеграций, начиная с Google Workspace.

## Что готово
- Экран «Интеграции» для Solo и Team.
- Google OAuth через сервер, без передачи OAuth client secret или refresh token в браузер.
- Инкрементальные разрешения: Sheets, Drive, Docs, Calendar подключаются отдельно.
- Google Sheets: серверное чтение диапазона и запись значений.
- Refresh token хранится в server-only Firestore collection `integrationSecrets`, недоступной клиентским Firestore Rules.
- OAuth state подписывается HMAC и имеет срок жизни.
- Перед подключением/чтением/записью сервер проверяет Firebase пользователя и membership компании.
- AI Orchestrator лучше распознаёт запросы на таблицы/аналитику и презентации.

## Что нужно для реального подключения Google
Создать OAuth Client в Google Cloud и добавить server env:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_STATE_SECRET` (случайная длинная строка)
- `APP_URL` (например https://your-app.vercel.app)

Callback URL в Google Cloud должен быть:
`https://YOUR_APP/api/google?action=callback`

## Важно
Drive/Docs/Calendar пока имеют OAuth foundation и UI подключения. Первый рабочий data-action реализован для Google Sheets (read/write). Для Gmail намеренно не запрошены sensitive/restricted scopes на этом этапе — его лучше подключать отдельным этапом после подготовки consent/verification.

Следующий шаг: связать Sheets data-action с AI Team и Artifact Builder, чтобы запрос вида «возьми продажи из таблицы → проанализируй → создай отчёт/презентацию» выполнялся в одном workflow.
