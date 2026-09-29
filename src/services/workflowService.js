import { callServerAI, safeParseAIJSON } from './aiService';
import { readGoogleDoc, readGoogleSheet } from './integrationService';
import { createAIArtifact } from './artifactService';

const truncate = (value, limit = 12000) => String(value || '').slice(0, limit);

export const normalizeSheetValues = (values = []) => values.slice(0, 250).map((row) =>
  (Array.isArray(row) ? row : [row]).slice(0, 30).map((cell) => truncate(cell, 500))
);

export const validateWorkflowResult = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const summary = String(value.summary || '').trim();
  if (!summary) return null;
  return {
    title: String(value.title || 'AI-анализ').trim().slice(0, 160),
    summary,
    insights: Array.isArray(value.insights) ? value.insights.map(String).filter(Boolean).slice(0, 12) : [],
    recommendations: Array.isArray(value.recommendations) ? value.recommendations.map(String).filter(Boolean).slice(0, 12) : [],
    tasks: Array.isArray(value.tasks) ? value.tasks.map(String).filter(Boolean).slice(0, 10) : [],
    slides: Array.isArray(value.slides) ? value.slides.slice(0, 15).map((s) => ({
      title: String(s?.title || '').slice(0, 140),
      bullets: Array.isArray(s?.bullets) ? s.bullets.map(String).filter(Boolean).slice(0, 8) : [],
    })).filter((s) => s.title || s.bullets.length) : [],
    reportSections: Array.isArray(value.reportSections) ? value.reportSections.slice(0, 20).map((s) => ({
      heading: String(s?.heading || '').slice(0, 160), body: String(s?.body || '').slice(0, 6000),
    })).filter((s) => s.heading || s.body) : [],
    socialPost: {
      caption: String(value.socialPost?.caption || '').slice(0, 10000),
      hashtags: Array.isArray(value.socialPost?.hashtags) ? value.socialPost.hashtags.map(String).filter(Boolean).slice(0, 30) : [],
    },
    confidence: ['high','medium','low'].includes(value.confidence) ? value.confidence : 'medium',
  };
};

const workflowSystem = `Ты — AI-аналитик и продюсер артефактов внутри Flow Space.
Тебе передают цель пользователя и разрешённые данные из Google Sheets или Google Docs. Используй только эти данные. Не выдумывай показатели или факты.
Если данных недостаточно, укажи это в выводах. Подготовь материал, пригодный для немедленного использования.
Верни ТОЛЬКО валидный JSON без Markdown:
{
  "title":"короткий заголовок",
  "summary":"главный вывод в 2-5 предложениях",
  "insights":["факт/наблюдение"],
  "recommendations":["конкретное действие"],
  "tasks":["задача, которую можно создать"],
  "slides":[{"title":"слайд","bullets":["тезис"]}],
  "reportSections":[{"heading":"раздел","body":"готовый текст"}],
  "socialPost":{"caption":"готовый пост","hashtags":["#пример"]},
  "confidence":"high|medium|low"
}`;

export async function runSheetToArtifactWorkflow({ companyId, spreadsheetId, range, goal, outputType }) {
  const sheet = await readGoogleSheet({ companyId, spreadsheetId, range });
  const values = normalizeSheetValues(sheet.values || []);
  if (!values.length) throw new Error('В выбранном диапазоне Google Sheets нет данных');
  const response = await callServerAI({
    temperature: 0.2,
    messages: [
      { role: 'system', content: workflowSystem },
      { role: 'user', content: JSON.stringify({ goal: truncate(goal, 4000), requestedOutput: outputType, range: sheet.range || range, data: values }) },
    ],
  });
  const raw = response?.choices?.[0]?.message?.content?.trim() || '';
  let result = null;
  try { result = validateWorkflowResult(safeParseAIJSON(raw)); } catch { result = null; }
  if (!result) throw new Error('AI вернул некорректный результат. Попробуйте уточнить цель.');

  let artifactPayload;
  if (outputType === 'presentation') artifactPayload = { type: 'presentation', title: result.title, slides: result.slides.length ? result.slides : [{ title: result.title, bullets: [result.summary, ...result.insights] }] };
  else if (outputType === 'social_post') artifactPayload = { type: 'social_post', title: result.title, caption: result.socialPost.caption || result.summary, hashtags: result.socialPost.hashtags };
  else artifactPayload = { type: 'report', title: result.title, sections: result.reportSections.length ? result.reportSections : [
    { heading: 'Краткий вывод', body: result.summary },
    { heading: 'Наблюдения', body: result.insights.map(x => `• ${x}`).join('\n') },
    { heading: 'Рекомендации', body: result.recommendations.map(x => `• ${x}`).join('\n') },
  ] };
  const artifact = await createAIArtifact(artifactPayload);
  return { sheet: { range: sheet.range || range, rows: values.length }, result, artifact };
}


export async function runDocToArtifactWorkflow({ companyId, documentId, goal, outputType }) {
  const doc = await readGoogleDoc({ companyId, documentId });
  const text = truncate(doc.text, 60000).trim();
  if (!text) throw new Error('В Google Docs нет текста для анализа');
  const response = await callServerAI({
    temperature: 0.2,
    messages: [
      { role: 'system', content: workflowSystem },
      { role: 'user', content: JSON.stringify({ goal: truncate(goal, 4000), requestedOutput: outputType, source: { type: 'google_docs', title: doc.title }, data: text }) },
    ],
  });
  const raw = response?.choices?.[0]?.message?.content?.trim() || '';
  let result = null;
  try { result = validateWorkflowResult(safeParseAIJSON(raw)); } catch { result = null; }
  if (!result) throw new Error('AI вернул некорректный результат. Попробуйте уточнить цель.');
  let artifactPayload;
  if (outputType === 'presentation') artifactPayload = { type: 'presentation', title: result.title, slides: result.slides.length ? result.slides : [{ title: result.title, bullets: [result.summary, ...result.insights] }] };
  else if (outputType === 'social_post') artifactPayload = { type: 'social_post', title: result.title, caption: result.socialPost.caption || result.summary, hashtags: result.socialPost.hashtags };
  else artifactPayload = { type: 'report', title: result.title, sections: result.reportSections.length ? result.reportSections : [
    { heading: 'Краткий вывод', body: result.summary },
    { heading: 'Наблюдения', body: result.insights.map(x => `• ${x}`).join('\n') },
    { heading: 'Рекомендации', body: result.recommendations.map(x => `• ${x}`).join('\n') },
  ] };
  const artifact = await createAIArtifact(artifactPayload);
  return { source: { type: 'google_docs', documentId, title: doc.title, characters: text.length }, result, artifact };
}
