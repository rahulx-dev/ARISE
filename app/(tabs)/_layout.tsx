import React from 'react';
import { Tabs, router } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutGrid,
  ClipboardList,
  Crosshair,
  Dumbbell,
  User,
} from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(20, 22, 28, 0.92)' : 'rgba(255, 255, 255, 0.94)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          borderRadius: 32,
          marginHorizontal: 16,
          marginBottom: insets.bottom > 0 ? insets.bottom + 4 : 12,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.5 : 0.12,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#8E8E93' : '#687076',
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
            <LayoutGrid size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, focused }) => (
            <Crosshair size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
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
            <Dumbbell size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
