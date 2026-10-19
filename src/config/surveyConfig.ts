export const SURVEY_CONFIG = {
  // CPX Research Live App Configuration
  CPX: {
    APP_ID: '36203',
    ENABLED: true,
    BASE_URL: 'https://offers.cpx-research.com/index.php',
    THEME_STYLE: 'dark',
    MAIN_COLOR: '0284C7', // Solo Leveling Electric Cyan/Blue
  },

  // BitLabs Configuration (Loaded via Environment Variable)
  BITLABS: {
    API_TOKEN: process.env.EXPO_PUBLIC_BITLABS_API_TOKEN || '',
    ENABLED: !!process.env.EXPO_PUBLIC_BITLABS_API_TOKEN,
    BASE_URL: 'https://web.bitlabs.ai/',
  },

  // NOTE (Batch 5D): there is NO in-app profit split anymore. The
  // publisher's share is set where the money is computed:
  // - CPX dashboard -> currency factor (crystals per $1 AFTER your
  //   commission; e.g. 180). The postback's amount_local already nets it.
  // - BitLabs dashboard -> reward conversion (VAL in crystals AFTER
  //   your commission). The callback's RAW is the USD paid to you.
  // The server grants exactly the network-computed crystal amount, and
  // only when the postback confirms revenue (amount_usd > 0). Any
  // in-app "80/20" constant would be a second, diverging source of
  // truth — so it was deleted, not moved.
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
  if (!token) return '';
  const safeUid = encodeURIComponent(userId || 'warrior_device');
  return `${SURVEY_CONFIG.BITLABS.BASE_URL}?token=${token}&uid=${safeUid}`;
}
