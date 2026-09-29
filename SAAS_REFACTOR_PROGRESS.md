# Flow Space — SaaS refactor progress

## Milestone 1: Owner-first foundation

Completed:
- Executive Overview for owner/manager.
- Deterministic Risk Engine for overdue work, review bottlenecks, missing expected result, overload and excessive urgent work.
- AI Team: Copywriter, SMM, Sales, Strategist, Lawyer, HR, Analyst, Operations AI.
- AI output reframed around measurable result and acceptance criteria.
- Navigation fixes and safer legacy writes.

## Milestone 2: Physical SaaS data isolation

Completed in this working copy:

### New Firestore model
- `users/{uid}` — only personal profile and active company pointer.
- `users/{uid}/personalTasks/{taskId}` — physically private My Space.
- `companies/{companyId}` — company metadata/settings/subscription.
- `companies/{companyId}/members/{uid}` — role and membership.
- `companies/{companyId}/tasks/{taskId}` — Company Space tasks/results.
- `companies/{companyId}/sops/{sopId}` — company SOPs.
- `companyInvites/{email}` — server-only pending invites.

### Migration
- Owner accounts automatically copy legacy arrays from `users/{ownerUid}` into the new company subcollections once.
- Legacy active + archived tasks are preserved; archived tasks become company tasks with `status: done`.
- Legacy SOPs/team/settings/KPI/subscription state are copied.
- Migration is marked on the company document and does not repeat.
- Existing legacy document is deliberately NOT deleted yet; it is a recovery source until migration is verified in production.

### Access model
- Personal tasks are only accessible by their user.
- Owner/manager can read company tasks.
- Member subscription is query-scoped to tasks assigned to that member (Firestore Rules are not used as a filter).
- Members cannot access another user's My Space.
- `user_mappings` is retired in the new model.

### Server-side invitations
- Added `api/invites.js`.
- Owner/manager creates an invite through authenticated server API.
- Role assignment is no longer written by the browser.
- When the invited user logs in with the invited email, the server accepts the pending invite, creates membership and switches `activeCompanyId`.
- A manager cannot promote another manager; owner approval is required.

### Promo security
- Client-side `isPro: true` activation was removed.
- Added `api/promo.js`.
- Promo codes are read server-side from `FLOWSPACE_PROMO_CODES`.
- Only the company owner can activate a promo.
- Subscription state cannot be changed directly by Firestore client rules.

Example Vercel value:
`FLOWSPACE_PROMO_CODES={"FOCUS2026":{"plan":"pro","durationDays":30}}`

### Verification
- Production React build: PASS.
- Domain tests: 4/4 PASS.
- Default CRA `learn react` test removed and replaced with Flow Space tests.

## Important before production

1. Deploy `firestore.rules` separately to Firebase. Merely having the file in the project does not activate it.
2. Make sure Vercel has `FIREBASE_SERVICE_ACCOUNT` for server APIs.
3. Add `FLOWSPACE_PROMO_CODES` only if promo activation is needed.
4. Test migration first with a copy/test Firebase project if possible.
5. Keep the legacy `users/{ownerUid}` company arrays until new collections are verified.
6. After migration is proven, create a separate cleanup milestone instead of deleting legacy data immediately.

## Next milestone

- Task review/acceptance history (`reviewAttempts`, `reopenedCount`, result artifact, acceptance events).
- Quality KPI based on real acceptance/rework events.
- Executive AI that explains deterministic Risk Engine facts without inventing risks.
- Structured SOP fields and links from task -> SOP.
- Pending invite UI and company switcher.
- Replace array-replacement compatibility writes with granular task CRUD after UI migration is stable.

## Milestone 3 — Result Acceptance Layer
- Result artifact + acceptance criteria.
- Submit → Review → Accept / Return for rework.
- Review history, review attempts and rework counters.
- Quality KPI and rework risk signals.
- Executive AI brief grounded in deterministic Risk Engine facts.
- Company task rules tightened for member review permissions.

## Milestone 5 — Executive Decision Layer
- Risk Engine теперь классифицирует факты: monitor / team / owner.
- Executive Overview построен вокруг принципа управления по исключениям.
- Обычная операционка не эскалируется собственнику.
- Executive AI получает уже классифицированные факты и формирует три блока: не трогать / команда решает / решение собственника.

## Milestone 6 — Company Policy & Smart Escalations
- Добавлены настраиваемые пороги Executive Policy.
- Risk Engine теперь читает правила из `company.settings.executivePolicy`.
- Добавлен выбор первичного адресата операционных отклонений: manager/owner.
- Executive Overview показывает активные пороги компании.
- Добавлены тесты на пользовательские пороги и routing эскалаций.

## Milestone 7 — Solo → Team → Company
- Добавлен явный `productMode` (`solo` / `team`) с совместимостью со старым `isTeamMode`.
- Новый onboarding сначала спрашивает, работает пользователь один или с командой.
- Solo Mode получил отдельный Solo Overview и не показывает корпоративные разделы без необходимости.
- Solo использует персональные задачи; при переходе в Team личные данные остаются приватными.
- Team Mode включает Company Space, роли, KPI и Executive Overview.
- Переход между режимами не удаляет данные.
- 15 тестов проходят, production build проверен.

- Milestone 13: Content Studio — готовые посты + визуалы Polza AI + сохранение в задачи.
