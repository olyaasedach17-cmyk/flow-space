import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ROLES, WORKSPACES } from '../utils/workspaceUtils';
import {
  ensureOwnedCompany,
  ensureUserProfile,
  getMembership,
  migrateLegacyOwnerData,
  replaceCompanySops,
  replaceCompanyTasks,
  replacePersonalTasks,
  subscribeCompany,
  subscribeCompanySops,
  subscribeCompanyTasks,
  subscribeDepartmentTasks,
  subscribeMembers,
  subscribePersonalTasks,
  subscribeUserProfile,
  updateCompany,
  updateCompanyMember,
} from '../services/workspaceRepository';
import { acceptPendingInvite } from '../services/inviteService';

export default function useWorkspaceData({ user, workspace, defaultKpis, defaultAutomations, onError }) {
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [role, setRole] = useState(ROLES.OWNER);
  const [departmentId, setDepartmentId] = useState('');
  const [members, setMembers] = useState([]);
  const [companyTasks, setCompanyTasks] = useState([]);
  const [personalTasks, setPersonalTasks] = useState([]);
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [connectionRevision, setConnectionRevision] = useState(0);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCompany(null);
      setCompanyId(null);
      setDepartmentId('');
      setMembers([]);
      setCompanyTasks([]);
      setPersonalTasks([]);
      setSops([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubs = [];
    const pendingInitialData = new Set(['company', 'companyTasks', 'personalTasks']);
    const initialTimeout = setTimeout(() => {
      if (!cancelled && pendingInitialData.size > 0) {
        setLoadError(new Error('Данные не загрузились вовремя. Проверьте подключение или обновите сессию.'));
        setLoading(false);
      }
    }, 8000);

    const markInitialReady = (key) => {
      pendingInitialData.delete(key);
      if (!cancelled && pendingInitialData.size === 0) {
        clearTimeout(initialTimeout);
        setLoadError(null);
        setLoading(false);
      }
    };

    const fail = (error, context) => {
      if (cancelled) return;
      onError?.(error, context);
      setLoadError(error);
      setLoading(false);
    };

    const init = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const initialProfile = await ensureUserProfile(user);
        let inviteResult = null;
        const acceptInvite = () => acceptPendingInvite().catch((error) => {
            if (!String(error?.message || '').includes('Приглашение не найдено')) {
              console.warn('Invite acceptance skipped:', error);
            }
            return null;
          });

        if (initialProfile.activeCompanyId) {
          // Для существующего пользователя проверка редкого нового приглашения
          // идёт в фоне и не задерживает загрузку ежедневных задач.
          acceptInvite().then((result) => {
            if (!cancelled && result?.companyId && result.companyId !== initialProfile.activeCompanyId) {
              setConnectionRevision((value) => value + 1);
            }
          });
        } else {
          // При первом входе приглашение определяет, какое пространство открыть.
          inviteResult = await acceptInvite();
        }

        const profileUnsub = subscribeUserProfile(user.uid, (nextProfile) => {
          setProfile(nextProfile);
        }, (error) => fail(error, 'Профиль пользователя'));
        unsubs.push(profileUnsub);

        let nextCompanyId = inviteResult?.companyId || initialProfile.activeCompanyId;
        let shouldRunOwnerMaintenance = nextCompanyId === user.uid;
        if (!nextCompanyId) {
          nextCompanyId = await ensureOwnedCompany(user);
          shouldRunOwnerMaintenance = true;
        }

        if (cancelled) return;
        setCompanyId(nextCompanyId);

        const membership = nextCompanyId === user.uid ? null : await getMembership(nextCompanyId, user.uid);
        const nextRole = membership?.role || (nextCompanyId === user.uid ? ROLES.OWNER : (inviteResult?.role || ROLES.MEMBER));
        const nextDepartmentId = membership?.departmentId || '';
        setRole(nextRole);
        setDepartmentId(nextDepartmentId);

        unsubs.push(subscribeCompany(nextCompanyId, (nextCompany) => {
          setCompany(nextCompany);
          markInitialReady('company');
        }, (error) => fail(error, 'Компания')));
        unsubs.push(subscribeMembers(nextCompanyId, (nextMembers) => {
          setMembers(nextMembers);
          const ownMembership = nextMembers.find(item => (item.uid || item.firestoreId) === user.uid);
          if (ownMembership) {
            setRole(ownMembership.role || ROLES.MEMBER);
            setDepartmentId(ownMembership.departmentId || '');
          }
        }, (error) => fail(error, 'Команда')));
        unsubs.push(subscribeCompanySops(nextCompanyId, setSops, (error) => fail(error, 'Регламенты')));
        unsubs.push(nextRole === ROLES.MANAGER
          ? subscribeDepartmentTasks(nextCompanyId, nextDepartmentId, (nextTasks) => {
            setCompanyTasks(nextTasks);
            markInitialReady('companyTasks');
          }, (error) => fail(error, 'Задачи отдела'))
          : subscribeCompanyTasks(nextCompanyId, nextRole, user.uid, (nextTasks) => {
            setCompanyTasks(nextTasks);
            markInitialReady('companyTasks');
          }, (error) => fail(error, 'Задачи компании')));
        unsubs.push(subscribePersonalTasks(user.uid, (nextTasks) => {
          setPersonalTasks(nextTasks);
          markInitialReady('personalTasks');
        }, (error) => fail(error, 'Личные задачи')));

        // Создание недостающих служебных документов и одноразовая миграция не
        // должны блокировать первый показ уже существующих задач.
        if (shouldRunOwnerMaintenance) {
          Promise.resolve()
            .then(() => ensureOwnedCompany(user))
            .then(() => migrateLegacyOwnerData(user, defaultKpis, defaultAutomations))
            .catch((error) => console.warn('Owner workspace maintenance skipped:', error));
        }
      } catch (error) {
        fail(error, 'Инициализация рабочего пространства');
      }
    };

    init();
    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      unsubs.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [user, defaultKpis, defaultAutomations, onError, connectionRevision]);

  const sourceTasks = workspace === WORKSPACES.PERSONAL ? personalTasks : companyTasks;
  const activeTasks = useMemo(() => sourceTasks.filter((task) => task.status !== 'done'), [sourceTasks]);
  const archive = useMemo(() => sourceTasks.filter((task) => task.status === 'done'), [sourceTasks]);

  const assistants = useMemo(() => members.map((member) => ({
    id: member.uid || member.firestoreId,
    uid: member.uid || member.firestoreId,
    name: member.name || member.email?.split('@')[0] || 'Сотрудник',
    email: member.email || '',
    position: member.position || 'Сотрудник',
    role: member.role || ROLES.MEMBER,
    departmentId: member.departmentId || '',
    departmentName: member.departmentName || '',
  })), [members]);

  const docData = useMemo(() => {
    if (!company || !companyId) return null;
    return {
      ...company,
      role,
      departmentId,
      settings: company.settings || {},
      assistants,
      tasks: activeTasks,
      archive,
      sops,
      kpis: company.kpis || defaultKpis,
      isPro: company.subscription?.plan === 'pro' || company.subscription?.plan === 'business' || company.subscription?.plan === 'executive',
      appliedPromo: company.legacyAppliedPromo || null,
    };
  }, [company, companyId, role, departmentId, assistants, activeTasks, archive, sops, defaultKpis]);

  const updateWorkspace = useCallback(async (patch) => {
    if (!user || !companyId) throw new Error('Рабочее пространство ещё не готово');
    const promises = [];

    if (patch.settings) promises.push(updateCompany(companyId, { settings: patch.settings }));
    if (patch.kpis) promises.push(updateCompany(companyId, { kpis: patch.kpis }));
    if (patch.savedTime !== undefined) promises.push(updateCompany(companyId, { savedTime: patch.savedTime }));

    if (patch.sops) promises.push(replaceCompanySops(companyId, patch.sops));

    if (patch.tasks || patch.archive) {
      const nextActive = patch.tasks || activeTasks;
      const nextArchive = patch.archive || archive;
      const nextAll = [...nextActive, ...nextArchive];
      if (workspace === WORKSPACES.PERSONAL) {
        promises.push(replacePersonalTasks(user.uid, nextAll));
      } else {
        promises.push(replaceCompanyTasks(companyId, nextAll, { role, uid: user.uid, departmentId, knownIds: [...activeTasks, ...archive].map(t => String(t.firestoreId || t.id)) }));
      }
    }

    await Promise.all(promises);
  }, [user, companyId, activeTasks, archive, workspace, role, departmentId]);

  const updateSettings = useCallback(async (settings) => {
    if (!companyId) return;
    await updateCompany(companyId, { settings });
  }, [companyId]);

  const updateMember = useCallback(async (uid, patch) => {
    if (!companyId) throw new Error('Компания ещё не загружена');
    await updateCompanyMember(companyId, uid, patch);
  }, [companyId]);

  const switchToOwnedCompany = useCallback(async () => {
    if (!user) return;
    const owned = await ensureOwnedCompany(user);
    setCompanyId(owned);
    toast.success('Переключено на ваше пространство');
  }, [user]);

  const retryConnection = useCallback(() => {
    setLoadError(null);
    setConnectionRevision((value) => value + 1);
  }, []);

  return {
    loading,
    loadError,
    retryConnection,
    profile,
    company,
    companyId,
    role,
    departmentId,
    members,
    assistants,
    docData,
    tasks: activeTasks,
    archive,
    sops,
    updateWorkspace,
    updateSettings,
    updateMember,
    switchToOwnedCompany,
  };
}
