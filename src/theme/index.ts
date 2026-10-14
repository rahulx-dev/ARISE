import { colors } from './colors';
import { typography, fontSizes, fontWeights, scale } from './typography';
import { spacing, borderRadius, responsive } from './spacing';
import { shadows, glowShadow } from './shadows';
import { animations, timing, springConfig, withPremiumSpring } from './animations';

export const theme = {
  colors,
  typography,
  fontSizes,
  fontWeights,
  spacing,
  borderRadius,
  shadows,
  animations,
};

export {
  colors,
  typography,
  fontSizes,
  fontWeights,
  scale,
  spacing,
  borderRadius,
  responsive,
  shadows,
  glowShadow,
  animations,
  timing,
  springConfig,
  withPremiumSpring,
};

export {
  darkThemeColors,
  lightThemeColors,
  getThemeColors,
  ThemeMode,
  ThemeColors,
} from './themeEngine';
export { useTheme } from '../hooks/useTheme';

