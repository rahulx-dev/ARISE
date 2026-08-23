import { TimePackage } from '../types/shop';
import { AchievementDefinition } from '../types/achievement';
import { StatName } from '../types/player';

export const APP_NAME = 'ARISE';

export const BASE_XP = 100;
export const XP_MULTIPLIER = 1.5;

export const MAX_CUSTOM_QUEST_COINS = 200;
export const MAX_CUSTOM_QUEST_XP = 500;
export const MAX_EXERCISE_TARGET = 200;
export const MIN_EXERCISE_TARGET = 1;

export const TIME_PACKAGES: TimePackage[] = [
  { id: 'time_5', durationMinutes: 5, coinCost: 20, label: 'Quick Break', description: '5 minutes of screen time' },
  { id: 'time_10', durationMinutes: 10, coinCost: 40, label: 'Short Break', description: '10 minutes of screen time' },
  { id: 'time_20', durationMinutes: 20, coinCost: 80, label: 'Standard Break', description: '20 minutes of screen time' },
  { id: 'time_30', durationMinutes: 30, coinCost: 110, label: 'Long Break', description: '30 minutes of screen time' },
  { id: 'time_60', durationMinutes: 60, coinCost: 200, label: 'Deep Dive', description: '60 minutes of screen time' },
];

export const STAT_NAMES: StatName[] = [
  'strength',
  'discipline',
  'focus',
  'health',
  'knowledge',
];

export const QUEST_CATEGORY_DISPLAY = {
  FITNESS: 'Fitness',
  FOCUS: 'Focus',
  PRODUCTIVITY: 'Productivity',
};

export const EXERCISE_TYPE_DISPLAY = {
  PUSHUP: 'Push-Ups',
  SQUAT: 'Squats',
  SITUP: 'Sit-Ups',
  JUMPING_JACK: 'Jumping Jacks',
  PLANK: 'Plank',
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_quest', title: 'The Journey Begins', description: 'Complete your first quest', icon: 'star', category: 'GENERAL', checkFn: 'checkFirstQuest' },
  { id: 'streak_3', title: 'On a Roll', description: 'Maintain a 3-day streak', icon: 'flame', category: 'STREAK', checkFn: 'checkStreak3' },
  { id: 'level_5', title: 'Rising Star', description: 'Reach Level 5', icon: 'chevron-up', category: 'LEVEL', checkFn: 'checkLevel5' },
  { id: 'rich_1000', title: 'Wealthy', description: 'Accumulate 1,000 coins', icon: 'cash', category: 'COINS', checkFn: 'checkCoins1000' },
  { id: 'pushup_100', title: 'Iron Arms', description: 'Complete 100 total push-ups', icon: 'fitness-outline', category: 'FITNESS', checkFn: 'checkPushups100' },
  { id: 'focus_master', title: 'Zen Master', description: 'Complete 5 focus quests', icon: 'eye', category: 'FOCUS', checkFn: 'checkFocus5' },
];
