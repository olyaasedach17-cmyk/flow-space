# Milestone 12 — Content Visuals via Polza AI

Добавлена реальная генерация изображений внутри Flow Space через Polza AI.

## Что работает
- новый серверный endpoint `api/images.js`;
- Firebase Auth перед каждым запросом;
- один серверный `POLZA_API_KEY`, ключ не попадает в браузер;
- модель настраивается через `POLZA_IMAGE_MODEL` (по умолчанию `openai/gpt-image-1.5`);
- форматы: квадрат, вертикальный, горизонтальный, stories;
- качество: low / medium / high;
- визуал можно открыть и сохранить в выбранную задачу;
- история генерации сохраняется в `aiExecutionHistory`;
- URL результата сохраняется в `resultArtifact`;
- AI Visual Studio доступна и Solo, и Team пользователям.

## Переменные окружения
```
POLZA_API_KEY=...
POLZA_IMAGE_MODEL=openai/gpt-image-1.5
```

## Важно
Polza AI может вернуть `pending`, если генерация занимает больше 120 секунд. Текущая версия показывает пользователю, что генерация продолжается. Следующий шаг — добавить автоматический polling Media API и Content Studio для пакетной генерации постов/каруселей.
