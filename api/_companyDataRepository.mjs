export function createCompanyDataRepository(companyRef) {
  const map = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  return {
    async listTasks(limit = 500) {
      return map(await companyRef.collection('tasks').limit(Math.min(limit, 500)).get());
    },
    async listMembers(limit = 500) {
      return map(await companyRef.collection('members').limit(Math.min(limit, 500)).get());
    },
  };
}
