/**
 * ARISE — Curated High-Tier Hunter & Gamer Nicknames (50 Total)
 * Handcrafted mix of 25 Badass Male & 25 Aesthetic Female gamer tags.
 */

export const HUNTER_NICKNAMES_BOYS = [
  'ShadowMonarch',
  'Jinwoo',
  'VoidWalker',
  'NightBane',
  'DarkReaper',
  'FrostSlayer',
  'ThunderStrike',
  'SoulReaper',
  'PhantomViper',
  'ApexHunter',
  'DeathBlade',
  'SilverFang',
  'RogueTitan',
  'CyberViper',
  'BloodHound',
  'GhostRider',
  'NetherWarlord',
  'StormRider',
  'IronClad',
  'SoloStriker',
  'AbyssWalker',
  'ZephyrBlade',
  'BlazeKnight',
  'ShadowStriker',
  'DarkNova',
] as const;

export const HUNTER_NICKNAMES_GIRLS = [
  'ShadowEmpress',
  'Valkyrie',
  'CrimsonRose',
  'FrostQueen',
  'LunaNova',
  'MysticViper',
  'ArtemisMoon',
  'UmbraWitch',
  'ScarletWitch',
  'BlackLotus',
  'StormMistress',
  'Nyx',
  'VelvetVoid',
  'SavageQueen',
  'LunarVixen',
  'CrystalSlayer',
  'Seraphina',
  'DarkAngel',
  'Raven',
  'MidnightStar',
  'MoonHuntress',
  'Athena',
  'Celestia',
  'Siren',
  'NeonPrincess',
] as const;

export const HUNTER_ALIASES = [
  ...HUNTER_NICKNAMES_BOYS,
  ...HUNTER_NICKNAMES_GIRLS,
] as const;

export function getRandomHunterName(gender?: 'male' | 'female'): string {
  if (gender === 'male') {
    const idx = Math.floor(Math.random() * HUNTER_NICKNAMES_BOYS.length);
    return HUNTER_NICKNAMES_BOYS[idx];
  }
  if (gender === 'female') {
    const idx = Math.floor(Math.random() * HUNTER_NICKNAMES_GIRLS.length);
    return HUNTER_NICKNAMES_GIRLS[idx];
  }
  const randomIndex = Math.floor(Math.random() * HUNTER_ALIASES.length);
  return HUNTER_ALIASES[randomIndex];
}
