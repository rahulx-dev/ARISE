import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { fontFamilies } from '../../src/theme/typography';
import { useTranslation } from '../../src/services/i18n';
import { Icon3D, Icon3DName } from '../../src/components/ui/Icon3D';

function TabNavIcon({
  activeName,
  inactiveName,
  focused,
  size = 28,
}: {
  activeName: Icon3DName;
  inactiveName: Icon3DName;
  focused: boolean;
  size?: number;
}) {
  return (
    <View style={styles.iconContainer}>
      <Icon3D
        name={focused ? activeName : inactiveName}
        size={size}
        style={{
          opacity: focused ? 1 : 0.75,
          transform: [{ scale: focused ? 1.05 : 0.95 }],
        }}
      />
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();

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
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E8E4DC',
          height: 64 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
          elevation: 6,
          shadowColor: '#1A1A1A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#E53935',
        tabBarInactiveTintColor: '#858F9E',
        tabBarLabelStyle: {
          fontFamily: fontFamilies.semiBold,
          fontSize: 10.5,
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      {/* 1. HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome', 'Home'),
          tabBarIcon: ({ focused }) => (
            <TabNavIcon
              activeName="nav_home_active"
              inactiveName="nav_home_inactive"
              focused={focused}
              size={28}
            />
          ),
        }}
      />

      {/* 2. QUESTS TAB */}
      <Tabs.Screen
        name="quests"
        options={{
          title: t('tabQuests', 'Quests'),
          tabBarIcon: ({ focused }) => (
            <TabNavIcon
              activeName="nav_quests_active"
              inactiveName="nav_quests_inactive"
              focused={focused}
              size={28}
            />
          ),
        }}
      />

      {/* 3. DUNGEON / GATES TAB */}
      <Tabs.Screen
        name="gates"
        options={{
          title: t('tabDungeon', 'Gates'),
          tabBarIcon: ({ focused }) => (
            <TabNavIcon
              activeName="nav_gates_active"
              inactiveName="nav_gates_inactive"
              focused={focused}
              size={28}
            />
          ),
        }}
      />

      {/* 4. GYM TRAINING TAB */}
      <Tabs.Screen
        name="gym"
        options={{
          title: t('tabGym', 'Gym'),
          tabBarIcon: ({ focused }) => (
            <TabNavIcon
              activeName="nav_gym_active"
              inactiveName="nav_gym_inactive"
              focused={focused}
              size={28}
            />
          ),
        }}
      />

      {/* 5. PROFILE / WARRIOR TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile', 'Profile'),
          tabBarIcon: ({ focused }) => (
            <TabNavIcon
              activeName="nav_profile_active"
              inactiveName="nav_profile_inactive"
              focused={focused}
              size={28}
            />
          ),
        }}
      />

      {/* HIDDEN / SUB TABS */}
      <Tabs.Screen
        name="focus"
        options={{
          href: null,
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

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 34,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -3,
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#E53935',
  },
});
