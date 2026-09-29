export const PRODUCT_MODES = Object.freeze({
  SOLO: 'solo',
  TEAM: 'team',
});

export const deriveProductMode = (settings = {}) => {
  if (settings?.productMode === PRODUCT_MODES.TEAM) return PRODUCT_MODES.TEAM;
  if (settings?.productMode === PRODUCT_MODES.SOLO) return PRODUCT_MODES.SOLO;
  return settings?.isTeamMode ? PRODUCT_MODES.TEAM : PRODUCT_MODES.SOLO;
};

export const buildModeSettings = (mode, currentSettings = {}, teamSize) => {
  const isTeam = mode === PRODUCT_MODES.TEAM;
  return {
    ...currentSettings,
    productMode: mode,
    isTeamMode: isTeam,
    teamSize: isTeam ? (teamSize && teamSize !== '👤 Я один' ? teamSize : '👥 2-5 человек') : '👤 Я один',
    onboardingCompleted: true,
    onboardingVersion: 1,
  };
};
