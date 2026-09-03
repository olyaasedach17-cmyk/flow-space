// Centralized Firestore paths for the SaaS data model.
// Keeping paths here prevents My Space and Company Space from being mixed accidentally.

export const userDocPath = (uid) => `users/${uid}`;
export const personalTasksPath = (uid) => `users/${uid}/personalTasks`;
export const personalTaskPath = (uid, taskId) => `${personalTasksPath(uid)}/${taskId}`;

export const companyDocPath = (companyId) => `companies/${companyId}`;
export const companyMembersPath = (companyId) => `companies/${companyId}/members`;
export const companyMemberPath = (companyId, uid) => `${companyMembersPath(companyId)}/${uid}`;
export const companyTasksPath = (companyId) => `companies/${companyId}/tasks`;
export const companyTaskPath = (companyId, taskId) => `${companyTasksPath(companyId)}/${taskId}`;
export const companySopsPath = (companyId) => `companies/${companyId}/sops`;
export const companySopPath = (companyId, sopId) => `${companySopsPath(companyId)}/${sopId}`;
export const companyAutomationsPath = (companyId) => `companies/${companyId}/automations`;
export const companyAutomationPath = (companyId, automationId) => `${companyAutomationsPath(companyId)}/${automationId}`;

export const inviteDocPath = (inviteId) => `companyInvites/${inviteId}`;
