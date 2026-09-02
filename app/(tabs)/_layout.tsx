import React from 'react';
import { Tabs, router } from 'expo-router';
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
 * Modern Solid Charcoal Floating Navigation Bar (Titanium Azure Tier)
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#121216' : '#FFFFFF',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: isDark ? '#1F1F27' : '#E5E5EA',
          borderRadius: 24,
          marginHorizontal: 16,
          marginBottom: insets.bottom > 0 ? insets.bottom + 4 : 14,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 14,
          elevation: 10,
        },
        tabBarActiveTintColor: '#0A84FF', // Titanium Azure Accent
        tabBarInactiveTintColor: isDark ? '#636366' : '#8E8E93',
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
              color={focused ? '#0A84FF' : color}
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
              color={focused ? '#0A84FF' : color}
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
              color={focused ? '#0A84FF' : color}
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
              color={focused ? '#0A84FF' : color}
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
              color={focused ? '#0A84FF' : color}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
