export const SURVEY_CONFIG = {
  // CPX Research Live App Configuration
  CPX: {
    APP_ID: '36203',
    ENABLED: true,
    BASE_URL: 'https://offers.cpx-research.com/index.php',
    THEME_STYLE: 'dark',
    MAIN_COLOR: '0284C7', // Solo Leveling Electric Cyan/Blue
  },

  // BitLabs Configuration (Live & Active)
  BITLABS: {
    API_TOKEN: 'd2253b50-45d4-4b41-aafc-274165b8f051',
    ENABLED: true,
    BASE_URL: 'https://web.bitlabs.ai/',
  },

  // 80/20 Profit Model
  PROFIT_MODEL: {
    APP_OWNER_SHARE_PERCENT: 80,
    HUNTER_SHARE_PERCENT: 20,
    CRYSTALS_PER_INR: 10,
    CPX_CURRENCY_FACTOR: 180, // Set in CPX Dashboard
  },
};

/**
 * Builds the personalized live CPX Survey Offerwall URL for a given hunter.
 * @param userId Unique hunter device/cloud ID
 * @param surveyId Optional specific survey ID
 */
export function getCpxOfferwallUrl(userId: string, surveyId?: string): string {
  const appId = SURVEY_CONFIG.CPX.APP_ID;
  const theme = SURVEY_CONFIG.CPX.THEME_STYLE;
  const color = SURVEY_CONFIG.CPX.MAIN_COLOR;
  const safeUid = encodeURIComponent(userId || 'warrior_device');

  let url = `${SURVEY_CONFIG.CPX.BASE_URL}?app_id=${appId}&ext_user_id=${safeUid}&theme_style=${theme}&main_color=${color}`;
  if (surveyId) {
    url += `&survey_id=${encodeURIComponent(surveyId)}`;
  }
  return url;
}

/**
 * Builds the BitLabs Survey URL once configured.
 */
export function getBitLabsUrl(userId: string): string {
  const token = SURVEY_CONFIG.BITLABS.API_TOKEN;
  const safeUid = encodeURIComponent(userId || 'warrior_device');
  return `${SURVEY_CONFIG.BITLABS.BASE_URL}?token=${token}&uid=${safeUid}`;
}
