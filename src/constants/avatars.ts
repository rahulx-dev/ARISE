export interface AvatarItem {
  id: string;
  name: string;
  source: any;
}

export const ALL_AVATARS: AvatarItem[] = [
  { id: 'pfp_01', name: 'Warrior', source: require('../../assets/img/pfp_01.jpg') },
  { id: 'pfp_02', name: 'Hunter', source: require('../../assets/img/pfp_02.jpg') },
  { id: 'pfp_03', name: 'Knight', source: require('../../assets/img/pfp_03.jpg') },
  { id: 'pfp_04', name: 'Mage', source: require('../../assets/img/pfp_04.jpg') },
  { id: 'pfp_05', name: 'Shadow', source: require('../../assets/img/pfp_05.jpg') },
  { id: 'pfp_06', name: 'Monarch', source: require('../../assets/img/pfp_06.jpg') },
  { id: 'pfp_07', name: 'Assassin', source: require('../../assets/img/pfp_07.jpg') },
  { id: 'pfp_08', name: 'Berserk', source: require('../../assets/img/pfp_08.jpg') },
  { id: 'pfp_09', name: 'Valkyrie', source: require('../../assets/img/pfp_09.jpg') },
  { id: 'pfp_10', name: 'Titan', source: require('../../assets/img/pfp_10.jpg') },
  { id: 'pfp_11', name: 'Specter', source: require('../../assets/img/pfp_11.jpg') },
  { id: 'pfp_12', name: 'Phoenix', source: require('../../assets/img/pfp_12.jpg') },
  { id: 'pfp_13', name: 'Ronin', source: require('../../assets/img/pfp_13.jpg') },
  { id: 'pfp_14', name: 'Slayer', source: require('../../assets/img/pfp_14.jpg') },
  { id: 'pfp_15', name: 'Apex', source: require('../../assets/img/pfp_15.jpg') },
  { id: 'pfp_16', name: 'Dragon', source: require('../../assets/img/pfp_16.jpg') },
  { id: 'pfp_17', name: 'Cipher', source: require('../../assets/img/pfp_17.jpg') },
  { id: 'pfp_18', name: 'Phantom', source: require('../../assets/img/pfp_18.jpg') },
  { id: 'pfp_19', name: 'Sol', source: require('../../assets/img/pfp_19.jpg') },
  { id: 'pfp_20', name: 'Eclipse', source: require('../../assets/img/pfp_20.jpg') },
  { id: 'pfp_21', name: 'Nova', source: require('../../assets/img/pfp_21.jpg') },
  { id: 'pfp_22', name: 'Viper', source: require('../../assets/img/pfp_22.jpg') },
  { id: 'pfp_23', name: 'Aegis', source: require('../../assets/img/pfp_23.jpg') },
  { id: 'pfp_24', name: 'Storm', source: require('../../assets/img/pfp_24.jpg') },
  { id: 'pfp_25', name: 'Frost', source: require('../../assets/img/pfp_25.jpg') },
  { id: 'pfp_26', name: 'Kaiser', source: require('../../assets/img/pfp_26.jpg') },
  { id: 'pfp_27', name: 'Zenith', source: require('../../assets/img/pfp_27.jpg') },
  { id: 'pfp_28', name: 'Vortex', source: require('../../assets/img/pfp_28.jpg') },
  { id: 'pfp_29', name: 'Rogue', source: require('../../assets/img/pfp_29.jpg') },
  { id: 'pfp_30', name: 'Gale', source: require('../../assets/img/pfp_30.jpg') },
  { id: 'pfp_31', name: 'Nebula', source: require('../../assets/img/pfp_31.jpg') },
  { id: 'pfp_32', name: 'Raven', source: require('../../assets/img/pfp_32.jpg') },
  { id: 'pfp_33', name: 'Blade', source: require('../../assets/img/pfp_33.jpg') },
  { id: 'pfp_34', name: 'Starlight', source: require('../../assets/img/pfp_34.jpg') },
  { id: 'pfp_35', name: 'Spider', source: require('../../assets/img/pfp_35.jpg') },
  { id: 'pfp_36', name: 'Chill', source: require('../../assets/img/pfp_36.jpg') },
  { id: 'pfp_37', name: 'Victoria', source: require('../../assets/img/pfp_37.jpg') },
  { id: 'pfp_38', name: 'Reaper', source: require('../../assets/img/pfp_38.jpg') },
  { id: 'pfp_39', name: 'Autumn', source: require('../../assets/img/pfp_39.jpg') },
];

export function getAvatarSource(
  iconId: string | null | undefined,
  profileImageUri?: string | null
): any {
  // 1. If explicit profileImageUri provided
  if (profileImageUri && typeof profileImageUri === 'string' && profileImageUri.trim().length > 0) {
    return { uri: profileImageUri };
  }
  // 2. If iconId itself is a local file or remote URI
  if (
    typeof iconId === 'string' &&
    (iconId.startsWith('file:') ||
      iconId.startsWith('content:') ||
      iconId.startsWith('https://') ||
      iconId.startsWith('data:'))
  ) {
    return { uri: iconId };
  }
  // 3. Fallback for 'user' or 'custom' without URI
  if (!iconId || iconId === 'user' || iconId === 'custom') {
    return ALL_AVATARS[0].source;
  }
  // 4. Normal avatar matching (supporting pfp_*, img_pfp_*, avatar_pfp_*)
  const cleanId = iconId.replace('img_', '').replace('avatar_', '');
  const match = ALL_AVATARS.find((a) => a.id === iconId || a.id === cleanId);
  return match ? match.source : ALL_AVATARS[0].source;
}
