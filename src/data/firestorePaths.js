export const userPath = (uid) => `users/${uid}`;
export const personalTasksPath = (uid) => `users/${uid}/personalTasks`;
export const companyPath = (companyId) => `companies/${companyId}`;
export const companyMembersPath = (companyId) => `companies/${companyId}/members`;
export const companyTasksPath = (companyId) => `companies/${companyId}/tasks`;
export const companySopsPath = (companyId) => `companies/${companyId}/sops`;
// Server-owned collections. Client code must use authenticated API endpoints.
export const companyApprovalsPath = (companyId) => `companies/${companyId}/approvals`;
export const companyMetricsPath = (companyId) => `companies/${companyId}/metrics`;
export const companyAIAuditPath = (companyId) => `companies/${companyId}/aiAudit`;
