import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getThemeColors, ThemeColors, ThemeMode } from '../theme/themeEngine';

export function useTheme(): { colors: ThemeColors; themeMode: ThemeMode; isDark: boolean } {
  const systemColorScheme = useColorScheme();
  const themeSetting = useSettingsStore((s) => s.theme) as ThemeMode || 'system';

  const systemIsDark = systemColorScheme !== 'light';
  const colors = getThemeColors(themeSetting, systemIsDark);

  return {
    colors,
    themeMode: themeSetting,
    isDark: colors.isDark,
  };
}
