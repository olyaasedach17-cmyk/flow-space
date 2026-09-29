export const COMPANY_ROLES = Object.freeze({ OWNER: 'owner', MANAGER: 'manager', MEMBER: 'member' });
export const COMPANY_ROLE_VALUES = Object.freeze(Object.values(COMPANY_ROLES));

export const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const isSafeSegment = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export async function requireCompanyAccess({ db, companyId, user, roles = COMPANY_ROLE_VALUES, requireDepartment = false }) {
  if (!isSafeSegment(companyId)) throw fail('Некорректное пространство.');
  if (!user?.uid) throw fail('Authentication required.', 401);
  const companyRef = db.doc(`companies/${companyId}`);
  const memberRef = companyRef.collection('members').doc(user.uid);
  const [companySnap, memberSnap] = await Promise.all([companyRef.get(), memberRef.get()]);
  if (!companySnap.exists) throw fail('Компания не найдена.', 404);
  if (!memberSnap.exists) throw fail('Нет доступа к компании.', 403);
  const membership = memberSnap.data() || {};
  if (!roles.includes(membership.role)) throw fail('Недостаточно прав.', 403);
  if (requireDepartment && membership.role === COMPANY_ROLES.MANAGER && !membership.departmentId) {
    throw fail('Сначала назначьте руководителю отдел.', 403);
  }
  return { companyId, companyRef, company: companySnap.data() || {}, memberRef, membership, user };
}

export function canAccessDepartment(access, departmentId) {
  const role = access?.membership?.role;
  if (role === COMPANY_ROLES.OWNER) return true;
  if (role === COMPANY_ROLES.MANAGER) return Boolean(access.membership.departmentId) && access.membership.departmentId === departmentId;
  return false;
}

export function assertDepartmentAccess(access, departmentId) {
  if (!canAccessDepartment(access, departmentId)) throw fail('Нет доступа к данным этого отдела.', 403);
}

export async function assertCompanyAccessStillValid(access) {
  const snapshot = await access?.memberRef?.get();
  if (!snapshot?.exists) throw fail('Доступ изменился. Результат не сохранён.', 403);
  const current = snapshot.data() || {};
  if (current.role !== access.membership.role) throw fail('Доступ изменился. Повторите запрос.', 403);
  if (current.role === COMPANY_ROLES.MANAGER && current.departmentId !== access.membership.departmentId) {
    throw fail('Доступ к отделу изменился. Повторите запрос.', 403);
  }
  return current;
}
