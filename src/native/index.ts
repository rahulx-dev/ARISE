import { Platform } from 'react-native';
import { IAppBlockerDriver, IScreenTimerDriver } from './types';
import { NativeAppBlockerDriver } from './drivers/nativeAppBlockerDriver';
import { MockAppBlockerDriver } from './drivers/mockAppBlockerDriver';
import { NativeScreenTimerDriver } from './drivers/nativeScreenTimerDriver';
import { MockScreenTimerDriver } from './drivers/mockScreenTimerDriver';

const mockAppBlocker = new MockAppBlockerDriver();
const nativeAppBlocker = new NativeAppBlockerDriver();

const mockScreenTimer = new MockScreenTimerDriver();
const nativeScreenTimer = new NativeScreenTimerDriver();

// ALWAYS use real native Android drivers on Android devices
export const appBlockerService: IAppBlockerDriver =
  Platform.OS === 'android' ? nativeAppBlocker : mockAppBlocker;

export const screenTimerService: IScreenTimerDriver =
  Platform.OS === 'android' ? nativeScreenTimer : mockScreenTimer;

export const previewHelpers = {
  mockAppBlocker,
  mockScreenTimer,
  isMockActive: Platform.OS !== 'android',
};

export * from './types';
export default {
  appBlockerService,
  screenTimerService,
  previewHelpers,
};
