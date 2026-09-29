import { buildDailyBrief } from '../src/domain/dailyBrief.js';
import { analyzeCompanyTasks } from '../src/domain/taskAnalysis.js';
import { createCompanyDataRepository } from './_companyDataRepository.mjs';

const scopedTasks = (tasks, access) => {
  if (access.membership.role === 'owner') return tasks;
  if (access.membership.role === 'manager') return tasks.filter((task) => task.departmentId === access.membership.departmentId);
  return tasks.filter((task) => task.assigneeId === access.user.uid);
};

export function createBusinessOverviewService(access) {
  const repository = createCompanyDataRepository(access.companyRef);
  return {
    async taskAnalysis({ now = new Date() } = {}) {
      const tasks = scopedTasks(await repository.listTasks(), access);
      return analyzeCompanyTasks(tasks, { now });
    },
    async dailyBrief({ now = new Date() } = {}) {
      const [tasks, members] = await Promise.all([repository.listTasks(), repository.listMembers()]);
      const company = { ...access.company, id: access.companyId };
      const visibleTasks = scopedTasks(tasks, access);
      const visibleMembers = access.membership.role === 'owner'
        ? members
        : members.filter((member) => member.departmentId === access.membership.departmentId);
      return buildDailyBrief({ company, tasks: visibleTasks, assistants: visibleMembers, now });
    },
  };
}
