import { authFetch } from './integrationService';

export const listActivityEvents = (companyId) => authFetch('/api/activity', {
  method: 'POST',
  body: JSON.stringify({ action: 'list', companyId }),
});

export const recordActivityEvent = (companyId, event) => authFetch('/api/activity', {
  method: 'POST',
  body: JSON.stringify({ action: 'record', companyId, ...event }),
});
