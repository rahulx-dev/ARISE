import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import {
  House,
  Lightning,
  Barbell,
  User,
  Trophy,
} from 'phosphor-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';

// Tab Icon Component (Maintains sleek minimal iOS vector style matching reference mockup)
function TabAnimatedIcon({
  fallbackIcon: FallbackIcon,
  focused,
}: {
  animationSource?: any;
  darkImageSource?: any;
  fallbackIcon: any;
  focused: boolean;
  color?: string;
  isDark?: boolean;
  playTrigger?: number;
  size?: number;
}) {
  return (
    <View style={styles.iconContainer}>
      <FallbackIcon
        size={23}
        color={focused ? '#38BDF8' : 'rgba(255, 255, 255, 0.65)'}
        weight={focused ? 'fill' : 'regular'}
      />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  // State to trigger animation play on every click/tap
  const [tabTapState, setTabTapState] = useState<{ tab: string; time: number }>({
    tab: 'index',
    time: Date.now(),
  });

  return (
    <Tabs
      screenListeners={({ route }) => ({
        tabPress: () => {
          haptics.light();
          setTabTapState({ tab: route.name, time: Date.now() });
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom > 0 ? insets.bottom + 6 : 14,
          left: 18,
          right: 18,
          height: 64,
          borderRadius: 36,
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.22)',
          paddingBottom: 6,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          } : {}),
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.65)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: -0.1,
          marginTop: 2,
        },
      }}
    >
      {/* 1. HOME TAB */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/home.json')}
              darkImageSource={require('../../assets/dark theme nav/home.png')}
              fallbackIcon={House}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'index' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 2. QUESTS TAB */}
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/icons8-thunder.json')}
              darkImageSource={require('../../assets/dark theme nav/quest.png')}
              fallbackIcon={Lightning}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'quests' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 3. DUNGEON / GATES TAB */}
      <Tabs.Screen
        name="gates"
        options={{
          title: 'Dungeon',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/trophy.json')}
              darkImageSource={require('../../assets/dark theme nav/sword.png')}
              fallbackIcon={Trophy}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'gates' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 4. GYM TRAINING TAB */}
      <Tabs.Screen
        name="gym"
        options={{
          title: 'Gym',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/gym.json')}
              darkImageSource={require('../../assets/dark theme nav/gym.png')}
              fallbackIcon={Barbell}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'gym' ? tabTapState.time : undefined}
              size={28}
            />
          ),
        }}
      />

      {/* 5. PROFILE / WARRIOR TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabAnimatedIcon
              animationSource={require('../../assets/Animations/profile.json')}
              darkImageSource={require('../../assets/dark theme nav/profile.png')}
              fallbackIcon={User}
              focused={focused}
              color={color}
              isDark={isDark}
              playTrigger={tabTapState.tab === 'profile' ? tabTapState.time : undefined}
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
  lottieIcon: {
    aspectRatio: 1,
    alignSelf: 'center',
  },
  imageIcon: {
    aspectRatio: 1,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -3,
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#E53935',
  },
});
