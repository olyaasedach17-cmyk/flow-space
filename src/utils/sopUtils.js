const cleanListItem = (value) => String(value || '').replace(/^[-•\s]+/, '').trim();

export const parseSopSteps = (content) => {
  const source = String(content || '').trim();
  if (!source) return [];
  const numbered = source
    .split(/(?=\b\d+[.)]\s+)/)
    .map((item) => item.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered;
  return source.split('\n').map(cleanListItem).filter(Boolean);
};

export const normalizeSop = (sop = {}) => {
  const steps = Array.isArray(sop.steps) && sop.steps.length
    ? sop.steps.map(cleanListItem).filter(Boolean)
    : parseSopSteps(sop.content);
  return {
    ...sop,
    title: String(sop.title || 'Регламент').trim(),
    purpose: String(sop.purpose || '').trim(),
    steps,
    criteria: Array.isArray(sop.criteria) ? sop.criteria.map(cleanListItem).filter(Boolean) : [],
    ownerId: String(sop.ownerId || ''),
    ownerName: String(sop.ownerName || ''),
    version: Math.max(1, Number(sop.version) || 1),
    versionHistory: Array.isArray(sop.versionHistory) ? sop.versionHistory : [],
    content: String(sop.content || steps.map((step, index) => `${index + 1}. ${step}`).join('\n')).trim(),
    updatedAt: sop.updatedAt || sop.createdAt || null,
  };
};

export const buildSopContent = (steps) => (steps || [])
  .map(cleanListItem)
  .filter(Boolean)
  .map((step, index) => `${index + 1}. ${step}`)
  .join('\n');

export const updateSopVersion = (sop, changes, actorId = '') => {
  const current = normalizeSop(sop);
  const nextSteps = Array.isArray(changes.steps) ? changes.steps.map(cleanListItem).filter(Boolean) : current.steps;
  const nextCriteria = Array.isArray(changes.criteria) ? changes.criteria.map(cleanListItem).filter(Boolean) : current.criteria;
  const next = {
    ...current,
    ...changes,
    title: String(changes.title ?? current.title).trim() || current.title,
    purpose: String(changes.purpose ?? current.purpose).trim(),
    steps: nextSteps,
    criteria: nextCriteria,
    ownerId: String(changes.ownerId ?? current.ownerId),
    ownerName: String(changes.ownerName ?? current.ownerName),
    content: buildSopContent(nextSteps),
  };
  const changed = ['title', 'purpose', 'content', 'ownerId', 'ownerName']
    .some((key) => String(next[key] || '') !== String(current[key] || ''))
    || JSON.stringify(nextCriteria) !== JSON.stringify(current.criteria);
  if (!changed) return current;
  const updatedAt = new Date().toISOString();
  return {
    ...next,
    version: current.version + 1,
    updatedAt,
    date: new Date(updatedAt).toLocaleDateString('ru-RU'),
    versionHistory: [
      ...(current.versionHistory || []),
      {
        version: current.version,
        title: current.title,
        purpose: current.purpose,
        steps: current.steps,
        criteria: current.criteria,
        ownerId: current.ownerId,
        ownerName: current.ownerName,
        content: current.content,
        replacedAt: updatedAt,
        replacedBy: actorId || null,
      },
    ].slice(-20),
  };
};
