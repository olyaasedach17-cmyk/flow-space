// Shared contract for company agents. No credentials or provider access.
export const CONTEXT_FIELDS = [
 ['companyDescription','О компании'],['products','Продукты / услуги'],['audience','Целевая аудитория'],
 ['salesChannels','Каналы продаж'],['companyGoals','Цели компании'],['currentPriorities','Текущие приоритеты'],
 ['toneOfVoice','Тон бренда'],['brandRules','Важные правила'],['constraints','Ограничения'],
 ['industry','Отрасль'],['geography','География'],['website','Сайт'],['pricingNotes','Цены и условия'],
 ['deliveryInfo','Доставка'],['returnPolicy','Возвраты'],['customNotes','Дополнительная информация'],
];
export const normalizeCompanyContext = (source = {}) => Object.fromEntries(CONTEXT_FIELDS.map(([key]) => [key, String(source?.[key] || '').trim().slice(0, 2500)]));
export const COMPANY_AGENTS = {
 sales: {name:'AI Sales', description:'Возможности продаж, черновики контактов и предложения следующих действий.', permissions:['company_context','recommendations']},
 ceo: {name:'AI CEO Assistant', description:'Краткий обзор задач, KPI, рисков и решений собственника.', permissions:['company_context','company_tasks','kpi','recommendations']},
};
export function canUseAgent(role, type) { return ['sales','ceo'].includes(type) && (role === 'owner' || (role === 'manager' && type === 'sales')); }
export function normalizeAgent(type, input = {}) {
 const base = COMPANY_AGENTS[type];
 if (!base) throw new Error('Неизвестный тип агента');
 return {id:type,type,name:base.name,description:base.description,instructions:String(input.instructions || '').trim().slice(0,3000),enabled:input.enabled !== false,permissions:base.permissions};
}
const text = (v, n=2500) => typeof v === 'string' ? v.trim().slice(0,n) : '';
export function parseAgentResult(raw, type) {
 let value; try { value=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')); } catch {throw new Error('AI вернул некорректный JSON. Результат не сохранён.');}
 if (!value || !Array.isArray(value.insights) || !value.insights.length) throw new Error('AI не вернул рекомендации');
 const insights=value.insights.slice(0,5).map(x=>({
  type:type === 'ceo'?'executive_summary':'sales_opportunity',title:text(x.title,160),summary:text(x.summary,1200),details:text(x.details,6000),
  priority:['low','medium','high'].includes(x.priority)?x.priority:'medium',
  suggestedAction:{title:text(x.suggestedAction?.title,160),expectedResult:text(x.suggestedAction?.expectedResult,1500),successCriteria:Array.isArray(x.suggestedAction?.successCriteria)?x.suggestedAction.successCriteria.filter(y=>typeof y==='string').slice(0,5).map(y=>y.slice(0,300)):[]}
 }));
 if(insights.some(x=>!x.title || !x.summary))throw new Error('AI вернул неполную рекомендацию');
 return type==='ceo'?insights.slice(0,1):insights;
}
export function summarizeCompanyTasks(tasks, now=Date.now()) {
 const active=tasks.filter(t=>t.status!=='done');
 const overdue=active.filter(t=>t.dueDate && Date.parse(`${String(t.dueDate).slice(0,10)}T23:59:59Z`)<now);
 return {sampleSize:tasks.length,active:active.length,overdue:overdue.length,awaitingReview:active.filter(t=>t.status==='review').length,
 tasks:active.slice(0,50).map(t=>({id:t.id,title:text(t.text,200),status:t.status,dueDate:t.dueDate||'',expectedResult:text(t.expectedResult,500),important:!!t.important,urgent:!!t.urgent}))};
}
const GENERIC_ACTION_WORDS = new Set(['создать','создание','запуск','запустить','начать','подготовить','разработать','сделать','провести','организовать']);
const titleTokens = value => String(value||'').toLocaleLowerCase('ru').replace(/[^а-яёa-z0-9\s]/gi,' ').split(/\s+/).filter(word=>word.length>=4&&!GENERIC_ACTION_WORDS.has(word)).map(word=>word.replace(/(иями|ями|ами|ого|ему|ому|ыми|ими|ий|ый|ая|ое|ые|ую|юю|ов|ев|ам|ям|ах|ях|ом|ем|а|я|ы|и|у|ю|е|о)$/u,''));
export function isDuplicateTaskTitle(candidate,existingTitles=[]) {
 const wanted=new Set(titleTokens(candidate));if(!wanted.size)return false;
 return existingTitles.some(title=>{const present=new Set(titleTokens(title));const common=[...wanted].filter(token=>present.has(token)).length;return common===wanted.size||common===present.size||(common>=2&&common/Math.min(wanted.size,present.size)>=.67);});
}
export const FASHION_EXAMPLE = {
 companyDescription:'Вымышленный небольшой бренд женской одежды с небольшой командой.',industry:'Женская одежда',products:'Повседневная женская одежда, сезонные коллекции',audience:'Покупательницы, которым важны удобство и продуманный гардероб',salesChannels:'Офлайн-магазин, интернет-магазин, сайт, Instagram',companyGoals:'Рост продаж, повторные покупки, партнёрства, понятная картина бизнеса для владельца',currentPriorities:'Проверить гипотезу сотрудничества со стилистами',brandRules:'Не выдумывать цены, скидки, наличие товара, адреса и имена партнёров. Сообщения только в виде черновиков.',toneOfVoice:'Спокойно, уважительно, понятно',customNotes:'Демонстрационный профиль. Реальных клиентов и персональных данных нет.'
};
