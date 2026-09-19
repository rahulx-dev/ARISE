import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  Lightning,
  Timer,
  User,
  Sword,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          haptics.light();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1F222E' : '#E5E7EB',
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: '#E53935',
        tabBarInactiveTintColor: isDark ? '#8E8E93' : '#6B7280',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '800',
          letterSpacing: -0.2,
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <House
                size={22}
                color={focused ? '#E53935' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: '#E53935', marginTop: 3 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Lightning
                size={22}
                color={focused ? '#E53935' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: '#E53935', marginTop: 3 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Timer
                size={22}
                color={focused ? '#E53935' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: '#E53935', marginTop: 3 }} />
              )}
            </View>
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
                color={focused ? '#E53935' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: '#E53935', marginTop: 3 }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <User
                size={22}
                color={focused ? '#E53935' : color}
                weight={focused ? 'fill' : 'regular'}
              />
              {focused && (
                <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: '#E53935', marginTop: 3 }} />
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
          href: null,
        }}
      />
    </Tabs>
  );
}
