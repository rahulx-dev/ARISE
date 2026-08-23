import { useWindowDimensions, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fontScale = PixelRatio.getFontScale();

  const wp = (percentage: number) => {
    return (percentage * width) / 100;
  };

  const hp = (percentage: number) => {
    return (percentage * height) / 100;
  };

  const rs = (size: number) => {
    return (width / 375) * size;
  };

  return {
    wp,
    hp,
    rs,
    isSmallScreen: width < 360,
    isNormalScreen: width >= 360 && width < 410,
    isLargeScreen: width >= 410,
    screenWidth: width,
    screenHeight: height,
    insets,
    fontScale,
    isLargeFontScale: fontScale > 1.2,
  };
}
