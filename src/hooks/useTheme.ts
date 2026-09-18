import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getThemeColors, ThemeColors, ThemeMode } from '../theme/themeEngine';

export function useTheme(): { colors: ThemeColors; themeMode: ThemeMode; isDark: boolean } {
  const systemColorScheme = useColorScheme();
  const themeSetting = useSettingsStore((s) => s.theme) || 'dark';
  const systemIsDark = systemColorScheme !== 'light';
  const colors = getThemeColors(themeSetting, systemIsDark);

  const isDark = colors.isDark;
  const themeMode: ThemeMode = themeSetting;

  return {
    colors,
    themeMode,
    isDark,
  };
}
