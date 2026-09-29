/**
 * Модуль обработки бизнес-автоматизаций Flow Space
 */

/**
 * Проверяет правила автоматизации и отправляет уведомления
 */
export const runTaskAutomations = ({
  event,
  taskData,
  automations = [],
  notifyTelegram
}) => {
  if (!automations || automations.length === 0 || !notifyTelegram) return;

  automations.forEach((rule) => {
    if (!rule.enabled) return;

    // Триггер 1: Создана новая срочная задача
    if (event === 'task_created' && rule.event === 'task_created') {
      if (rule.condition === 'is_urgent' && taskData.urgent) {
        notifyTelegram('urgent_task', `⚡ Срочная задача: «${taskData.text}»\nОжидаемый результат: ${taskData.expectedResult || 'Не указан'}`);
      }
    }

    // Триггер 2: Задача переведена в статус проверки (Review)
    if (event === 'status_changed' && rule.event === 'status_changed') {
      if (taskData.status === rule.targetStatus) {
        notifyTelegram('result_submitted', `👀 Результат передан на проверку: «${taskData.text}».`);
      }
    }
  });
};
