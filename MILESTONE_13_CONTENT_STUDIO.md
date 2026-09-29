# Milestone 13 — Content Studio

Flow Space получил отдельный end-to-end сценарий создания публикаций для Solo и Team.

## Что добавлено
- Отдельный раздел **Content Studio**.
- Площадки: Instagram, Telegram, LinkedIn, Facebook.
- Цели: продажа, экспертный пост, прогрев, анонс, вовлечение.
- 1–3 готовых варианта публикации.
- AI-SMM + AI-копирайтер работают как один workflow.
- Используется память бренда из `settings.aiMemory` (описание компании, продукты, аудитория, tone of voice, правила и ограничения).
- AI возвращает структуру: hook, body, CTA, hashtags, стратегия, visualPrompt, карусель, assumptions/confidence.
- Визуал может автоматически генерироваться через существующий серверный Polza AI image endpoint.
- Форматы изображения: вертикальный, квадрат, горизонтальный, Stories 9:16.
- Готовый текст можно скопировать.
- Пост + визуал можно сохранить в существующую задачу Flow Space вместе с AI execution history.
- В браузер не передаётся POLZA_API_KEY.

## Архитектурно
- `src/services/contentStudioService.js` — генерация/валидация контент-пакета и запуск визуала.
- `src/components/ContentStudio.jsx` — UI полного workflow.
- существующие `/api/ai` и `/api/images` переиспользуются; новый секретный endpoint не нужен.
- Content Studio доступен как самостоятельный раздел и не зависит от Google integrations.

## Следующий логичный слой
Content Calendar / Content Plan: серия публикаций на неделю/месяц из цели, Google Sheets или проекта, с созданием отдельных задач и готовых визуалов.
