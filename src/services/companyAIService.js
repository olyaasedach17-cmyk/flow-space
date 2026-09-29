import { authFetch } from './integrationService';
export const companyAIRequest = (companyId, action, payload = {}) => authFetch('/api/company-ai', {
  method: 'POST', body: JSON.stringify({ ...payload, companyId, action }),
});
