export const SOCIAL_PROVIDER_IDS = Object.freeze(['instagram', 'telegram', 'facebook', 'linkedin']);

export function createSocialProvider({ id, publish }) {
  if (!SOCIAL_PROVIDER_IDS.includes(id) || typeof publish !== 'function') throw new Error('Некорректный social provider.');
  return Object.freeze({ id, publish });
}

export function unavailableSocialProvider(id) {
  return createSocialProvider({
    id,
    async publish() { throw Object.assign(new Error(`Публикация в ${id} пока не подключена.`), { statusCode: 501 }); },
  });
}

export const socialProviderRegistry = new Map(SOCIAL_PROVIDER_IDS.map((id) => [id, unavailableSocialProvider(id)]));
