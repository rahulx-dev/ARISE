import React from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  Lightning,
  Timer,
  Barbell,
  User,
  Trophy,
  Sword,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguageStore } from '../../src/services/i18n';

/**
 * Solid AMOLED Full-Bleed Navigation Bar matching Mockup 1:1
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const t = useLanguageStore((s) => s.t);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#030509' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#0E1422' : '#E5E7EB',
          borderWidth: 0,
          borderRadius: 0,
          marginHorizontal: 0,
          marginBottom: 0,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: '#0A84FF',
        tabBarInactiveTintColor: '#636675',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: -0.2,
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <House
                size={22}
                color={focused ? '#0A84FF' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 18, height: 2.5, borderRadius: 1.5, backgroundColor: '#0A84FF', marginTop: 3 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: t('tabQuests'),
          tabBarIcon: ({ color, focused }) => (
            <Lightning
              size={22}
              color={focused ? colors.primary : color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gates"
        options={{
          title: 'Dungeon',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Sword
                size={22}
                color={focused ? '#0284C7' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 18, height: 2.5, borderRadius: 1.5, backgroundColor: '#0284C7', marginTop: 3 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('workout'),
          tabBarIcon: ({ color, focused }) => (
            <Barbell
              size={22}
              color={focused ? colors.primary : color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, focused }) => (
            <User
              size={22}
              color={focused ? colors.primary : color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
