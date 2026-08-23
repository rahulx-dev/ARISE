import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * ARISE Runtime Configuration & Environment Detection
 * 
 * Automatically detects whether the app is executing inside Expo Go,
 * a standalone Development Build (with custom Kotlin native modules),
 * or Web browser.
 */

export interface RuntimeConfig {
  isExpoGo: boolean;
  isStandaloneDevClient: boolean;
  isWeb: boolean;
  isAndroid: boolean;
  previewModeActive: boolean;
  environmentName: 'Expo Go (Preview)' | 'Android Native Dev Client' | 'Web Preview';
}

// Detection logic
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';
const isStandaloneDevClient = isAndroid && !isExpoGo;

// When in Expo Go or Web, Preview Mode is automatically active to mock native-only Kotlin modules
const previewModeActive = isExpoGo || isWeb || !isAndroid;

export const runtimeConfig: RuntimeConfig = {
  isExpoGo,
  isStandaloneDevClient,
  isWeb,
  isAndroid,
  previewModeActive,
  environmentName: isExpoGo
    ? 'Expo Go (Preview)'
    : isStandaloneDevClient
    ? 'Android Native Dev Client'
    : 'Web Preview',
};

export default runtimeConfig;
