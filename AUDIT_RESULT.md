# Flow Space — audit result

Date: 2026-09-17

## READY

- Personal tasks are stored in `users/{uid}/personalTasks/{taskId}`.
- Company tasks are stored in `companies/{companyId}/tasks/{taskId}`.
- Today and Work have `Все / Работа / Личное` filters in My Space.
- Team users have a clear `Моё / Команда` switch.
- Personal task form is lightweight: title, date, optional time, recurrence, reminder.
- Personal and company cards have visible privacy labels.
- Company result lifecycle supports submission, review, acceptance and rework.
- Weekly, status, meeting and review briefings reuse current tasks, KPI, review and Risk Engine data.
- Personal tasks are excluded from company KPI, workload, risks and Executive AI.
- Personal AI does not receive company SOP or company context.
- Company calendar context does not receive personal Google Calendar events.
- Google, Telegram, AI and image tokens remain server side.
- Sensitive APIs require Firebase authentication; high-use AI/image routes have per-user rate limits.
- Personal recurring tasks create their next occurrence after completion.
- Due personal reminders are shown privately in Today.

## PARTIAL

- Authenticated screens passed an iPhone-width browser check; a final physical-device pass is still needed for the native keyboard and safe-area behavior.
- Production Google and text AI passed a live post-deployment check. Telegram delivery was confirmed earlier. Local Polza, Telegram and Google OAuth tests still require their provider secrets to be restored locally.
- Reminders are currently visible inside Flow Space; native operating-system push notifications are outside the current implementation.

## CRITICAL FIXED

- Personal and company data no longer depend on React filtering for isolation.
- Owner and manager cannot read an employee's private tasks.
- Employee cannot read another company.
- Employee cannot promote themselves.
- Manager cannot create or access tasks outside their department.
- Employee cannot mark their own company result as accepted.
- Personal tasks and calendar events are excluded from company AI and analytics.
- API rate limiting prevents unbounded AI and image requests.

## NOT IMPLEMENTED

- Destructive legacy-data removal. Legacy migration remains non-destructive by design.
- Native push notifications for personal reminders.
- Employee surveillance, CRM, payroll, messenger and video meetings, as explicitly excluded by the specification.

## PRIVACY TESTS

- User can CRUD their own private tasks: PASS.
- User cannot read another user's private task: PASS.
- Company owner cannot read employee private task: PASS.
- Personal tasks are excluded from company analytics and Executive AI: PASS.
- Company calendar briefing receives no private calendar events: PASS.

## FIRESTORE RULES TESTS

- 6 emulator-backed rules tests: PASS.
- Command: `npm run test:rules`.
- Portable Java and Firestore Emulator are stored under ignored `.tools/` and are not committed or deployed.

## BUILD

- Production build: PASS.
- Published Vercel build: PASS.
- Published main bundle: `build/static/js/main.bd12acd8.js`.
- Production deployment: `dpl_GpcUnu6XqKYasMuwa9V7CDt1W8yb`.
- Production alias: `https://flow-space-seven.vercel.app`.

## TESTS

- Frontend: 83 passed.
- Server/API: 44 passed.
- Firestore Rules: 6 passed.

## FILES CHANGED

- `api/_firebaseAdmin.mjs`
- `api/ai.mjs`
- `server/api-bundled/images.mjs`
- `src/App.js`
- `src/App.test.js`
- `src/components/AssistantView.jsx`
- `src/components/MatrixView.jsx`
- `src/components/MobileNav.jsx`
- `src/components/MobileNav.test.jsx`
- `src/components/Sidebar.jsx`
- `src/components/SoloOverview.jsx`
- `src/components/TaskCard.jsx`
- `src/components/TaskColumn.jsx`
- `src/components/TaskModal.jsx`
- `src/components/TaskModal.test.jsx`
- `src/utils/taskUtils.js`
- `tests/firestore-rules.rules.mjs`
- `tests/rate-limit.test.mjs`
- `firebase.json`
- `package.json`
- `package-lock.json`
- `.gitignore`

## MANUAL TESTS STILL REQUIRED

- Restore or rotate the missing local Polza, Telegram and Google OAuth secrets without copying them into chat. Firebase was restored locally from the supplied service-account file.
- Sign in with a real owner and employee account and repeat the privacy scenario end to end.
- Repeat image generation after the Polza secret is restored locally.
- Verify the authenticated screens on a physical iPhone, especially the keyboard, safe areas and long-form modal scrolling.

## LIVE PRODUCTION CHECK

- Production home page: HTTP 200.
- Unauthenticated `/api/ai` request: HTTP 401.
- Authenticated Today and Work screens: PASS.
- Personal/work filters and private labels: PASS.
- Central create button and lightweight personal-task form: PASS.
- Text AI briefing: PASS.
- Google Sheets, Drive, Docs and Calendar connection status: PASS.
