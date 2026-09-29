import { buildContentAgentPrompt, normalizeContentPackage, renderPostVariant } from '../src/domain/contentAgent.js';
import { createApprovalRepository } from './_approvalRepository.mjs';
import { assertCompanyAccessStillValid } from './_companyAccess.mjs';

const parseJSON = (raw) => {
  const cleaned = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
};

export function createContentAgentService({ db, access, provider }) {
  return {
    async generate(input) {
      const brandMemory = access.company?.settings?.aiMemory || {};
      const prompt = buildContentAgentPrompt({ ...input, brandMemory });
      const response = await provider({
        messages: [
          { role: 'system', content: 'Ты Content Agent Flow Space. Верни только JSON. Не выдумывай факты о компании.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.55,
        max_tokens: 3500,
      });
      let packageData;
      try { packageData = normalizeContentPackage(parseJSON(response.choices?.[0]?.message?.content)); }
      catch { throw Object.assign(new Error('AI вернул неполный пакет публикации.'), { statusCode: 502 }); }
      const liveMembership = await assertCompanyAccessStillValid(access);
      const selectedVariant = Math.min(Math.max(Number(input.selectedVariant) || 0, 0), packageData.variants.length - 1);
      const content = renderPostVariant(packageData.variants[selectedVariant]);
      const approval = await createApprovalRepository(db, access.companyId).create({
        type: 'content',
        title: packageData.title,
        content,
        createdBy: access.user.uid,
        metadata: {
          platform: String(input.platform || '').slice(0, 40),
          goal: String(input.goal || '').slice(0, 80),
          topic: String(input.topic || '').slice(0, 1000),
          selectedVariant,
          packageData,
          departmentId: liveMembership.departmentId || '',
        },
        proposedAction: { type: 'save_content', provider: input.platform || '' },
      });
      return { packageData, approval };
    },
  };
}
