import React from 'react';
import { Tabs, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  Lightning,
  Timer,
  Barbell,
  User,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';

/**
 * Stitch v2 Kinetic Glass Floating Navigation Bar with Phosphor Icons
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(18, 33, 49, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
          borderRadius: 32,
          marginHorizontal: 16,
          marginBottom: insets.bottom > 0 ? insets.bottom + 4 : 14,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          shadowColor: isDark ? '#CCFF00' : '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.15 : 0.1,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#C4C9AC' : '#687076',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: -0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <House
              size={22}
              color={focused ? colors.primary : color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
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
        name="rewards"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, focused }) => (
            <Timer
              size={22}
              color={focused ? colors.primary : color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/focus/session');
          },
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Gym',
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
          title: 'Profile',
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
